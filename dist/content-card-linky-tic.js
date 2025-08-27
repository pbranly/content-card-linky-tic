
/* content-card-linky-tic.js
 * Version: 2.0-tempo-agg
 * Description: Carte Linky TIC (myElectricalData) avec support optionnel
 *              d'un mode "Tempo Index" où l'on agrège 6 capteurs index Tempo
 *              (BBRHCJB / BBRHPJB / BBRHCJW / BBRHPJW / BBRHCJR / BBRHPJR).
 *              Quand tempo_entities est défini, la carte calcule un objet
 *              d'état synthétique (kWh) : total, HC total, HP total, % HP.
 *              Les autres fonctions (EcoWatt / Tempo couleurs / styles) sont
 *              inchangées.
 *
 * Config (exemple):
 * type: 'custom:content-card-linky-tic'
 * tempo_entities:
 *   - sensor.linky_tempo_index_bbrhcjb
 *   - sensor.linky_tempo_index_bbrhpjb
 *   - sensor.linky_tempo_index_bbrhcjw
 *   - sensor.linky_tempo_index_bbrhpjw
 *   - sensor.linky_tempo_index_bbrhcjr
 *   - sensor.linky_tempo_index_bbrhpjr
 * # (facultatif) entités EcoWatt / Tempo info
 * ewEntity: sensor.ecowatt_j0
 * ewEntityJ1: sensor.ecowatt_j1
 * ewEntityJ2: sensor.ecowatt_j2
 * tempoEntityInfo: sensor.edf_tempo_info
 * tempoEntityJ0: sensor.edf_tempo_j0
 * tempoEntityJ1: sensor.edf_tempo_j1
 *
 * Si "entity" (consommation) est fourni sans tempo_entities, le comportement
 * original est conservé.
 */

const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

window.customCards = window.customCards || [];
window.customCards.push({
  type: "content-card-linky-tic",
  name: "Carte Enedis Tic (Tempo Index compatible)",
  description: "Carte pour l'intégration MyElectricalData/ESPHome TIC avec agrégation des index Tempo.",
  preview: true,
  documentationURL: "https://github.com/pbranly/content-card-linky-tic",
});

const fireEvent = (node, type, detail, options) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};

const ecoWattForecastValues = new Map([
  ["Pas de valeur", "green"],
  [1, "green"],
  [2, "yellow"],
  [3, "red"],
]);

const tempoValues = new Map([
  ["unknown", "grey"],
  ["Inconnu", "grey"],
  ["BLUE", "blue"],
  ["WHITE", "white"],
  ["RED", "red"],
]);

function hasConfigOrEntityChanged(element, changedProps) {
  if (changedProps.has("config")) return true;
  const oldHass = changedProps.get("hass");
  if (oldHass) {
    const watched = element._getWatchedEntityId();
    if (!watched) return true;
    return oldHass.states[watched] !== element.hass.states[watched];
  }
  return true;
}

class ContentCardLinkyTic extends LitElement {
  static get properties() {
    return { config: {}, hass: {} };
  }

  static async getConfigElement() {
    await import("./content-card-linky-tic-editor.js");
    return document.createElement("content-card-linky-tic-editor");
  }

  /** Détermine quelle entité "réelle" surveiller pour shouldUpdate() */
  _getWatchedEntityId() {
    if (!this.config) return undefined;
    if (this.config.tempo_entities && this.config.tempo_entities.length > 0) {
      // observe la 1ère entité tempo comme proxy
      return this.config.tempo_entities[0];
    }
    return this.config.entity;
  }

  /** Construit un pseudo stateObj agrégé à partir des 6 index Tempo */
  _buildTempoAggregate(hass, tempoEntities = []) {
    const lower = (s) => (s || "").toString().toLowerCase();
    let hc = 0, hp = 0, missing = [];
    let unit = "kWh";

    for (const entId of tempoEntities) {
      const ent = hass.states[entId];
      if (!ent) { missing.push(entId); continue; }
      let val = Number.parseFloat(ent.state);
      if (Number.isNaN(val)) val = 0;

      // Détecte l'unité courante et convertit en kWh si Wh
      const u = ent.attributes?.unit_of_measurement;
      if (u && typeof u === "string" && u.toLowerCase() === "wh") {
        val = val / 1000.0;
        unit = "kWh";
      } else if (u && typeof u === "string" && u.toLowerCase() === "kwh") {
        unit = "kWh";
      }

      const id = lower(entId);
      // classe HC vs HP en se basant sur l'id de l'entité
      if (id.includes("bbrhc")) hc += val;
      else if (id.includes("bbrhp")) hp += val;
      else {
        // fallback: essaie selon attribut 'friendly_name'
        const fn = lower(ent.attributes?.friendly_name);
        if (fn.includes("hc")) hc += val;
        else if (fn.includes("hp")) hp += val;
        else hp += val; // par défaut
      }
    }

    const total = hc + hp;
    const hpPct = total > 0 ? (hp * 100.0) / total : 0;
    const errors = missing.length
      ? `Capteurs Tempo manquants: ${missing.join(", ")}`
      : "";

    // On simule les attributs attendus par la carte
    return {
      entity_id: tempoEntities[0] || "tempo.aggregate",
      state: total.toFixed(1),
      attributes: {
        typeCompteur: "consommation",
        unit_of_measurement: unit,
        // On réutilise les emplacements HC/HP d'hier pour exposer les cumuls totaux
        yesterday_HC: hc.toFixed(1),
        yesterday_HP: hp.toFixed(1),
        daily_cost: 0,
        yearly_evolution: 0,
        monthly_evolution: 0,
        current_month_evolution: 0,
        current_week_evolution: 0,
        yesterday_evolution: 0,
        peak_offpeak_percent: Math.round(hpPct),
        errorLastCall: errors,
        versionUpdateAvailable: false,
        versionGit: "",
        serviceEnedis: "myElectricalData",
      },
    };
  }

  render() {
    if (!this.config || !this.hass) return html``;

    let usingTempo = Array.isArray(this.config.tempo_entities) && this.config.tempo_entities.length >= 1;
    let stateObj = usingTempo
      ? this._buildTempoAggregate(this.hass, this.config.tempo_entities)
      : this.hass.states[this.config.entity];

    if (!stateObj) {
      return html`
        <ha-card>
          <div class="card">
            <div id="states">
              <div class="name">
                <ha-icon id="icon" icon="mdi:flash" data-state="unavailable" data-domain="connection" style="color: var(--state-icon-unavailable-color)"></ha-icon>
                <span style="margin-right:2em">Linky : données inaccessible pour ${usingTempo ? (this.config.tempo_entities || []).join(", ") : this.config.entity}</span>
              </div>
            </div>
          </div>
        </ha-card>
      `;
    }

    const attributes = stateObj.attributes || {};
    const modeCompteur = attributes["typeCompteur"];

    if ((modeCompteur === "consommation") || (!modeCompteur)) {
      const detailsEntity = usingTempo ? (this.config.tempo_entities[0] || "") : this.config.entity;
      return html`
        <ha-card id="card">
          ${this.addEventListener('click', () => { if (detailsEntity) this._showDetails(detailsEntity); })}
          ${this.renderTitle(this.config)}
          <div class="card">
            ${this.renderHeader(attributes, this.config, stateObj, usingTempo)}
            <div class="variations">
              ${this.config.showYearRatio
                ? html`
                  <span class="variations-linky">
                    <span class="ha-icon">
                      <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.yearly_evolution < 0) ? '45' : ((attributes.yearly_evolution == 0) ? "0" : "-45")}deg)"></ha-icon>
                    </span>
                    <div class="tooltip">
                      ${Math.round(attributes.yearly_evolution || 0)}<span class="unit"> %</span><span class="year">par rapport à ${this.previousYear()}</span>
                      <span class="tooltiptext">A-1 : ${attributes.current_year_last_year || '-'}<br>A : ${attributes.current_year || '-'}</span>
                    </div>
                  </span>`
                : html``
              }
              ${this.config.showMonthRatio
                ? html`
                  <span class="variations-linky">
                    <span class="ha-icon">
                      <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.monthly_evolution < 0) ? '45' : ((attributes.monthly_eolution == 0) ? "0" : "-45")}deg)"></ha-icon>
                    </span>
                    <div class="tooltip">
                      ${Math.round(attributes.monthly_evolution || 0)}<span class="unit"> %</span><span class="previous-month">par rapport à ${this.previousMonth()}</span>
                      <span class="tooltiptext">Mois Précedent A-1 : ${attributes.last_month_last_year || '-'}<br>Mois Précedent : ${attributes.last_month || '-'}</span>
                    </div>
                  </span>`
                : html``
              }
              ${this.config.showCurrentMonthRatio
                ? html`
                  <span class="variations-linky">
                    <span class="ha-icon">
                      <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.current_month_evolution < 0) ? '45' : ((attributes.current_month_evolution == 0) ? "0" : "-45")}deg)"></ha-icon>
                    </span>
                    <div class="tooltip">
                      ${Math.round(attributes.current_month_evolution || 0)}<span class="unit"> %</span><span class="current-month">par rapport à ${this.currentMonth()}</span>
                      <span class="tooltiptext">Mois  A-1 : ${attributes.current_month_last_year || '-'}<br>Mois  : ${attributes.current_month || '-'}</span>
                    </div>
                  </span>`
                : html``
              }
              ${this.config.showWeekRatio
                ? html`
                  <span class="variations-linky">
                    <span class="ha-icon">
                      <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.current_week_evolution < 0) ? '45' : ((attributes.current_week_evolution == 0) ? "0" : "-45")}deg)"></ha-icon>
                    </span>
                    <div class="tooltip">
                      ${Math.round(attributes.current_week_evolution || 0)}<span class="unit"> %</span><span class="previous-month">par rapport à ${this.weekBefore()}</span>
                      <span class="tooltiptext">Semaine dernière : ${attributes.last_week || '-'}<br>Semaine courante : ${attributes.current_week || '-'}</span>
                    </div>
                  </span>`
                : html``
              }
              ${this.config.showYesterdayRatio
                ? html`
                  <span class="variations-linky">
                    <span class="ha-icon">
                      <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.yesterday_evolution < 0) ? '45' : ((attributes.yesterday_evolution == 0) ? "0" : "-45")}deg)"></ha-icon>
                    </span>
                    <div class="tooltip">
                      ${Math.round(attributes.yesterday_evolution || 0)}<span class="unit"> %</span><span class="previous-month">par rapport à ${this.dayBeforeYesterday()}</span>
                      <span class="tooltiptext">Avant-hier : ${attributes.day_2 || '-'}<br>Hier : ${attributes.yesterday || '-'}</span>
                    </div>
                  </span>`
                : html``
              }
              ${this.config.showPeakOffPeak
                ? html`
                  <span class="variations-linky">
                    <span class="ha-icon">
                      <ha-icon icon="mdi:flash"></ha-icon>
                    </span>
                    ${Math.round(attributes.peak_offpeak_percent || 0)}<span class="unit"> % HP</span>
                  </span>`
                : html``
              }
            </div>
            ${this.renderHistory(
                attributes.daily,
                attributes.unit_of_measurement,
                attributes.dailyweek,
                attributes.dailyweek_cost,
                attributes.dailyweek_costHC,
                attributes.dailyweek_costHP,
                attributes.dailyweek_HC,
                attributes.dailyweek_HP,
                attributes.dailyweek_MP,
                attributes.dailyweek_MP_over,
                attributes.dailyweek_MP_time,
                attributes.dailyweek_Tempo,
                this.config
              )}
            ${this.renderEcoWatt(attributes, this.config)}
            ${this.renderTempo(attributes, this.config)}
            ${this.renderError(attributes.errorLastCall || "", this.config)}
            ${this.renderVersion(attributes.versionUpdateAvailable || false, attributes.versionGit || "")}
            ${this.renderInformation(attributes, this.config)}
          </div>
        </ha-card>`;
    }

    if (modeCompteur === "production") {
      return html`
        <ha-card>
          <div class="card">
            <div class="main-info">
              ${this.config.showIcon
                ? html`
                  <div class="icon-block">
                    <span class="linky-icon bigger" style="background: none, url('/local/community/content-card-linky-tic/icons/linky.svg') no-repeat; background-size: contain;"></span>
                  </div>`
                : html``
              }
              <div class="cout-block">
                <span class="cout">${this.toFloat(stateObj.state)}</span>
                <span class="cout-unit">${attributes.unit_of_measurement}</span>
              </div>
            </div>
            ${this.renderError(attributes.errorLastCall || "", this.config)}
          </div>
        </ha-card>`;
    }
  }

  _showDetails(myEntity) {
    const event = new Event('hass-more-info', { bubbles: true, cancelable: false, composed: true });
    event.detail = { entityId: myEntity };
    this.dispatchEvent(event);
    return event;
  }

  renderTitle(config) {
    if (this.config.showTitle === true) {
      return html`
        <div class="card">
          <div class="main-title"><span>${this.config.titleName}</span></div>
        </div>`;
    }
  }

  renderHeader(attributes, config, stateObj, usingTempo=false) {
    if (this.config.showHeader !== true) return html``;

    if (config.showPeakOffPeak) {
      // Affiche 2 blocs HC / HP (on utilise les cumuls en mode tempo)
      return html`
        <div class="main-info">
          ${this.renderIcon(attributes, config)}
          <div class="hp-hc-block">
            <span class="conso-hc">${this.toFloat(attributes.yesterday_HC || 0)}</span><span class="conso-unit-hc"> ${attributes.unit_of_measurement || "kWh"} <span class="more-unit">(en HC)</span></span><br />
            <span class="conso-hp">${this.toFloat(attributes.yesterday_HP || 0)}</span><span class="conso-unit-hp"> ${attributes.unit_of_measurement || "kWh"} <span class="more-unit">(en HP)</span></span>
          </div>
          ${this.renderPrice(attributes, config)}
        </div>`;
    } else {
      // Affiche un seul bloc total
      return html`
        <div class="main-info">
          ${this.renderIcon(attributes, config)}
          <div class="cout-block">
            <span class="cout">${this.toFloat(stateObj.state)}</span>
            <span class="cout-unit">${attributes.unit_of_measurement || "kWh"}</span>
          </div>
          ${this.renderPrice(attributes, config)}
        </div>`;
    }
  }

  renderIcon(attributes, config) {
    if (!this.config.showIcon) return html``;
    return html`
      <div class="icon-block">
        <span class="linky-icon bigger" style="background: none, url('/local/community/content-card-linky-tic/icons/linky.svg') no-repeat; background-size: contain;"></span>
      </div>`;
  }

  renderPrice(attributes, config) {
    if (!this.config.showPrice) return html``;
    return html`
      <div class="cout-block">
        <span class="cout" title="Coût journalier">${this.toFloat(attributes.daily_cost || 0, 2)}</span><span class="cout-unit"> €</span>
      </div>`;
  }

  renderError(errorMsg, config) {
    if (this.config.showError !== true) return html``;
    if (!errorMsg) return html``;
    return html`
      <div class="error-msg" style="color: red">
        <ha-icon id="icon" icon="mdi:alert-outline"></ha-icon>
        ${errorMsg}
      </div>`;
  }

  renderInformation(attributes, config) {
    if (attributes.serviceEnedis === undefined) return html``;
    if (attributes.serviceEnedis !== "myElectricalData") {
      return html`
        <div class="information-msg" style="color: red">
          <ha-icon id="icon" icon="mdi:alert-outline"></ha-icon>
          Merci de migrer sur myElectricalData.<br>EnedisGateway sera desactivé courant 2023.
        </div>`;
    }
    return html``;
  }

  renderVersion(versionUpdateAvailable, versionGit) {
    if (versionUpdateAvailable === true) {
      return html`
        <div class="information-msg" style="color: red">
          <ha-icon id="icon" icon="mdi:alert-outline"></ha-icon>
          Nouvelle version disponible ${versionGit}
        </div>`;
    }
    return html``;
  }

  renderHistory(daily, unit_of_measurement, dailyweek, dailyweek_cost, dailyweek_costHC, dailyweek_costHP, dailyweek_HC, dailyweek_HP, dailyweek_MP, dailyweek_MP_over, dailyweek_MP_time, dailyweek_Tempo, config) {
    if (this.config.showHistory !== true) return html``;
    if (dailyweek === undefined) return html``;
    let nbJours = dailyweek.toString().split(",").length;
    if (config.nbJoursAffichage <= nbJours) nbJours = config.nbJoursAffichage;
    return html`
      <div class="week-history">
        ${this.renderTitreLigne(config)}
        ${daily.slice(0, nbJours).reverse().map((day, index) =>
          this.renderDay(
            day,
            nbJours - index,
            unit_of_measurement,
            dailyweek, dailyweek_cost, dailyweek_costHC, dailyweek_costHP,
            dailyweek_HC, dailyweek_HP, dailyweek_MP, dailyweek_MP_over, dailyweek_MP_time,
            dailyweek_Tempo, config
          )
        )}
      </div>`;
  }

  renderDay(day, dayNumber, unit_of_measurement, dailyweek, dailyweek_cost, dailyweek_costHC, dailyweek_costHP, dailyweek_HC, dailyweek_HP, dailyweek_MP, dailyweek_MP_over, dailyweek_MP_time, dailyweek_Tempo, config) {
    return html`
      <div class="day">
        ${this.renderDailyWeek(dailyweek, dailyweek_Tempo, dayNumber, config)}
        ${this.renderDailyValue(day, dayNumber, unit_of_measurement, config)}
        ${this.renderDayPrice(dailyweek_cost, dayNumber, config)}
        ${this.renderDayPriceHCHP(dailyweek_costHC, dayNumber, config)}
        ${this.renderDayPriceHCHP(dailyweek_costHP, dayNumber, config)}
        ${this.renderDayHCHP(dailyweek_HC, dayNumber, unit_of_measurement, config)}
        ${this.renderDayHCHP(dailyweek_HP, dayNumber, unit_of_measurement, config)}
        ${this.renderDayMaxPower(dailyweek_MP, dayNumber, dailyweek_MP_over, dailyweek_MP_time, config)}
      </div>`;
  }

  renderDailyWeekTitre(maConfig, monTitre){
    if (maConfig === true) {
      return html`${monTitre}<br>`;
    }
    return html``;
  }

  renderTitreLigne(config) {
    if (this.config.showTitleLign !== true) return html``;
    return html`
      <div class="day">
        ${this.renderDailyWeekTitre(true, "")}
        ${this.renderDailyWeekTitre(true, "Conso")}
        ${this.renderDailyWeekTitre(this.config.showDayPrice, "Prix")}
        ${this.renderDailyWeekTitre(this.config.showDayPriceHCHP, "Prix HC")}
        ${this.renderDailyWeekTitre(this.config.showDayPriceHCHP, "Prix HP")}
        ${this.renderDailyWeekTitre(this.config.showDayHCHP, "HC")}
        ${this.renderDailyWeekTitre(this.config.showDayHCHP, "HP")}
        ${this.renderDailyWeekTitre(this.config.showDayMaxPower, "MP")}
        ${this.renderDailyWeekTitre(this.config.showDayMaxPowerTime, "MPtime")}
      </div>`;
  }

  renderDailyWeek(value, valueC, dayNumber, config) {
    if (!value) return html``;
    if (config.showTempoColor) {
      const valeurColor = valueC?.toString().split(",")[dayNumber-1];
      if ( valeurColor === "-1" ) {
        valueC = "color" ;
      } else {
        valueC = valeurColor?.toLowerCase();
      }
    } else {
      valueC = "white";
    }
    return html`
      <span class="tempoday-${valueC}">${new Date(value.toString().split(",")[dayNumber-1]).toLocaleDateString('fr-FR', {weekday: config.showDayName})}</span>
    `;
  }

  renderNoData(){
    return html`<br><span class="cons-val" title="Donnée indisponible"><ha-icon id="icon" icon="mdi:alert-outline"></ha-icon></span>`;
  }

  renderDailyValue(day, dayNumber, unit_of_measurement, config) {
    if ( day === -1 ) return this.renderNoData();
    return html`
      <br><span class="cons-val">${this.toFloat(day)}
        ${this.config.showInTableUnit ? html`${unit_of_measurement}` : html``}
      </span>`;
  }

  renderDayPrice(value, dayNumber, config) {
    if (config.kWhPrice) {
      return html`<br><span class="cons-val">${this.toFloat(value * config.kWhPrice, 2)} €</span>`;
    }
    if (config.showDayPrice) {
      const valeur = value?.toString().split(",")[dayNumber-1];
      if ( valeur === "-1" ) return this.renderNoData();
      return html`<br><span class="cons-val">${this.toFloat(valeur)} €</span>`;
    }
  }

  renderDayPriceHCHP(value, dayNumber, config) {
    if (!config.showDayPriceHCHP) return html``;
    const valeur = value?.toString().split(",")[dayNumber-1];
    if ( valeur === "-1" ) return this.renderNoData();
    return html`<br><span class="cons-val">${this.toFloat(valeur, 2)} €</span>`;
  }

  renderDayHCHP(value, dayNumber, unit_of_measurement, config) {
    if (!config.showDayHCHP) return html``;
    const valeur = value?.toString().split(",")[dayNumber-1];
    if ( valeur === "-1" ) return this.renderNoData();
    return html`
      <br><span class="cons-val">${this.toFloat(valeur, 2)}
        ${this.config.showInTableUnit ? html`${unit_of_measurement}` : html``}
      </span>`;
  }

  renderDayMaxPower(value, dayNumber, overMP, MPtime, config) {
    if (!config.showDayMaxPower) return html``;
    const valeur = value?.toString().split(",")[dayNumber-1];
    const over = overMP?.toString().split(",")[dayNumber-1];
    if ( valeur === "-1" ) return this.renderNoData();
    if ( over === "true") {
      return html`
        <br><span class="cons-val" style="color:red">${this.toFloat(valeur, 2)}</span>
        <br><span class="cons-val" style="color:red">${new Date(MPtime?.toString().split(",")[dayNumber-1]).toLocaleTimeString('fr-FR', { hour: "2-digit", minute: "2-digit" }) }</span>`;
    }
    return html`
      <br><span class="cons-val">${this.toFloat(valeur, 2)}</span>
      <br><span class="cons-val">${new Date(MPtime?.toString().split(",")[dayNumber-1]).toLocaleTimeString('fr-FR', { hour: "2-digit", minute: "2-digit" }) }</span>`;
  }

  getOneDayForecastTime(ecoWattForecast) {
    let ecoWattForecastDate = new Date(ecoWattForecast.attributes["date"]);
    return [ecoWattForecastDate];
  }

  getOneDayNextEcoWattText(ecoWattForecastEntity) {
    let forecastDate = new Date(ecoWattForecastEntity.attributes["date"]);
    for (let [time, value] of Object.entries(
      ecoWattForecastEntity.attributes["forecast"]
    )) {
      if ( time != undefined && ecoWattForecastValues.get(value) !== "green" ) {
        let timeStr = time.replace(/([345])5/g, "$10");
        return html `Actuellement: ${ecoWattForecastValues.get(value)}`;
      } else {
        return html `Ecowatt ${ forecastDate.toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric'}) }`;
      }
    }
    return "";
  }

  getOneDayNextEcoWatt(ecoWattForecastEntity) {
    let ecoWattForecastList = [];
    for (let [time, value] of Object.entries(
      ecoWattForecastEntity.attributes["forecast"]
    )) {
      if (time != undefined) {
        time = time.replace("h", "").trim();
        time = time.replace("min", "").trim();
        ecoWattForecastList.push([time, ecoWattForecastValues.get(value), value]);
      }
    }
    return ecoWattForecastList;
  }

  renderEcoWatt(attributes, config) {
    if (attributes.serviceEnedis === undefined ){
      return html ``;
    }
    if ( attributes.serviceEnedis !== "myElectricalData" ){
      return html `EcoWatt : uniquement disponible avec myElectricData`;
    }

    let sensorName = this.config.ewEntity;
    const ecoWattForecast = this.hass.states[sensorName];
    let sensorNameJ1 = this.config.ewEntityJ1;
    const ecoWattForecastJ1 = this.hass.states[sensorNameJ1];
    let sensorNameJ2 = this.config.ewEntityJ2;
    const ecoWattForecastJ2 = this.hass.states[sensorNameJ2];

    return html`
      <table style="width:100%">
        ${this.config.showEcoWatt
          ? html`
            <tr style="line-height:80%">
              <td style="width:5%">J+0</td>
              <td style="width:95%">
                <ul class="flow-row oneHour">
                  ${html`${this.getOneDayNextEcoWatt(ecoWattForecast).map(
                    (forecast) => html`<li class="ecowatt-${forecast[0]}" style="background: ${forecast[1]}" title="${forecast[1]} - ${forecast[0]}" ></li>`
                  )}`}
                </ul>
              </td>
            </tr>`
          : html``
        }
        ${this.config.showEcoWattJ12
          ? html`
            <tr style="line-height:80%">
              <td style="width:5%">J+1</td>
              <td style="width:95%">
                <ul class="flow-row oneHour">
                  ${html`${this.getOneDayNextEcoWatt(ecoWattForecastJ1).map(
                    (forecast) => html`<li class="ecowatt-${forecast[0]}" style="background: ${forecast[1]}" title="${forecast[1]} - ${forecast[0]}" ></li>`
                  )}`}
                </ul>
              </td>
            </tr>
            <tr style="line-height:80%">
              <td style="width:5%">J+2</td>
              <td style="width:95%">
                <ul class="flow-row oneHour">
                  ${html`${this.getOneDayNextEcoWatt(ecoWattForecastJ2).map(
                    (forecast) => html`<li class="ecowatt-${forecast[0]}" style="background: ${forecast[1]}" title="${forecast[1]} - ${forecast[0]}" ></li>`
                  )}`}
                </ul>
              </td>
            </tr>
            <tr style="line-height:80%">
              <td style="width:5%"> </td>
              <td style="width:95%">
                <ul class="flow-row oneHourLabel">
                  ${html`${this.getOneDayNextEcoWatt(ecoWattForecastJ2).map(
                    (forecast) => html`<li title="${forecast[0]}">${(forecast[0]%2==1) ? forecast[0] : ''}</li>`
                  )}`}
                </ul>
              </td>
            </tr>`
          : html``
        }
      </table>`;
  }

  getTempoDateValue(tempoEntity) {
    let tempoDate = new Date(tempoEntity.attributes["date"]);
    let tempoValue = tempoEntity.state;
    return [tempoDate, tempoValues.get(tempoValue), tempoValue];
  }

  getTempoRemainingDays(tempoEntity) {
    let tempoRemainingRed = tempoEntity.attributes["days_red"];
    let tempoRemainingWhite = tempoEntity.attributes["days_white"];
    let tempoRemainingBlue = tempoEntity.attributes["days_blue"];
    return [tempoRemainingRed, tempoRemainingWhite, tempoRemainingBlue];
  }

  renderTempo(attributes, config) {
    if (attributes.serviceEnedis === undefined ){
      return html ``;
    }
    if ( attributes.serviceEnedis !== "myElectricalData" ){
      return html `EcoWatt : uniquement disponible avec myElectricData`;
    }
    if (this.config.showTempo === false ){
      return html ``;
    }
    let sensorName = this.config.tempoEntityInfo;
    const tempoInfo = this.hass.states[sensorName];
    let sensorNameJ0 = this.config.tempoEntityJ0;
    const tempoJ0 = this.hass.states[sensorNameJ0];
    let sensorNameJ1 = this.config.tempoEntityJ1;
    const tempoJ1 = this.hass.states[sensorNameJ1];

    if (!tempoJ0 || !tempoJ1) {
      return html `Tempo: sensor(s) J0 et/ou J1 indisponible ou incorrecte`;
    }
    if (!tempoInfo) {
      return html `Tempo: sensor 'info' indisponible ou incorrecte`;
    }

    let [dateJ0, valueJ0, stateJ0] = this.getTempoDateValue(tempoJ0);
    let [dateJ1, valueJ1, stateJ1] = this.getTempoDateValue(tempoJ1);
    let [remainingRed, remainingWhite, remainingBlue] = this.getTempoRemainingDays(tempoInfo);

    return html`
      <table class="tempo-color">
        <tr>
          <td class="tempo-${valueJ0}" style="width:50%">${ (new Date(dateJ0)).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric'})}</td>
          <td class="tempo-${valueJ1}" style="width:50%">${ (new Date(dateJ1)).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric'})}</td>
        </tr>
      </table>
      <table class="tempo-days">
        <tr>
          <td class="tempo-blue" style="width:33.33%">${remainingBlue}</td>
          <td class="tempo-white" style="width:33.33%">${remainingWhite}</td>
          <td class="tempo-red" style="width:33.33%">${remainingRed}</td>
        </tr>
      </table>
    `;
  }

  setConfig(config) {
    if (!config.entity && !(config.tempo_entities && config.tempo_entities.length)) {
      throw new Error('Vous devez définir "entity" OU "tempo_entities"');
    }

    if (config.kWhPrice && isNaN(config.kWhPrice)) {
      throw new Error('kWhPrice doit être numérique');
    }

    const defaultConfig = {
      showHistory: true,
      showHeader: true,
      showPeakOffPeak: true,
      showIcon: false,
      showInTableUnit: false,
      showDayPrice: false,
      showDayPriceHCHP: false,
      showDayMaxPower: false,
      showDayHCHP: false,
      showDayName: "long",
      showError: true,
      shoInformation: true,
      showPrice: true,
      showTitle: false,
      showCurrentMonthRatio: true,
      showMonthRatio: true,
      showWeekRatio: false,
      showYesterdayRatio: false,
      showTitleLign: false,
      showEcoWatt: false,
      showEcoWattJ12: false,
      showTempo: false,
      showTempoColor: false,
      titleName: "LINKY",
      nbJoursAffichage: "7",
      kWhPrice: undefined,
      tempo_entities: [],
    };

    this.config = { ...defaultConfig, ...config };
  }

  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  getCardSize() { return 3; }

  toFloat(value, decimals = 1) {
    const n = Number.parseFloat(value);
    if (Number.isNaN(n)) return (0).toFixed(decimals);
    return n.toFixed(decimals);
  }

  previousYear() {
    var d = new Date();
    d.setFullYear(d.getFullYear()-1 );
    return d.toLocaleDateString('fr-FR', {year: "numeric"});
  }

  previousMonth() {
    var d = new Date();
    d.setMonth(d.getMonth()-1);
    d.setFullYear(d.getFullYear()-1);
    return d.toLocaleDateString('fr-FR', {month: "long", year: "numeric"});
  }

  currentMonth() {
    var d = new Date();
    d.setFullYear(d.getFullYear()-1);
    return d.toLocaleDateString('fr-FR', {month: "long", year: "numeric"});
  }

  weekBefore() { return "semaine"; }
  dayBeforeYesterday() { return "avant-hier"; }

  static get styles() {
    return css`
      .card { margin: auto; padding: 1.5em 1em 1em 1em; position: relative; cursor: pointer; }
      ha-card ul { list-style: none; padding: 0; margin: 0; }
      .main-title { margin: auto; text-align: center; font-weight: 200; font-size: 2em; justify-content: space-between; }
      .main-info { display: flex; overflow: hidden; align-items: center; justify-content: space-between; height: 75px; }
      .ha-icon { margin-right: 5px; color: var(--state-icon-color); }
      .cout { font-weight: 300; font-size: 3.5em; }
      .cout-unit { font-weight: 300; font-size: 1.2em; display: inline-block; }
      .conso-hp, .conso-hc { font-weight: 200; font-size: 2em; }
      .conso-unit-hc, .conso-unit-hp { font-weight: 100; font-size: 1em; }
      .more-unit { font-style: italic; font-size: 0.8em; }
      .variations { display: flex; justify-content: space-between; overflow: hidden; }
      .variations-linky { display: inline-block; font-weight: 300; margin: 0px 0px 5px; overflow: hidden; }
      .unit { font-size: .8em; }
      .week-history { display: flex; overflow: hidden; }
      .day { flex: auto; text-align: center; border-right: .1em solid var(--divider-color); line-height: 2; box-sizing: border-box; }
      .dayname { font-weight: bold; text-transform: capitalize; }
      .week-history .day:last-child { border-right: none; }
      .cons-val {}
      .year, .previous-month, .current-month { font-size: 0.8em; font-style: italic; margin-left: 5px; }
      .linky-icon.bigger { width: 6em; height: 5em; display: inline-block; }
      .tooltip .tooltiptext {
        visibility: hidden; background: var(--ha-card-background, var(--card-background-color, white));
        box-shadow: 2px 2px 6px -4px #999; cursor: default; font-size: 14px;
        opacity: 1; pointer-events: none; position: absolute; display: flex;
        flex-direction: column; overflow: hidden; z-index: 12; transition: 0.15s ease all;
        padding: 5px; border: 1px solid #cecece; border-radius: 3px;
      }
      .tooltip .tooltiptext::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px; border-width: 5px; border-style: solid; border-color: #555 transparent transparent transparent; }
      .tooltip:hover .tooltiptext { visibility: visible; opacity: 1; }

      .flow-row { display: flex; flex-flow: row wrap; }
      .oneHour { height: 1em; }
      .oneHour > li { background-color: var(--state-icon-color); border-right: 1px solid var(--lovelace-background, var(--primary-background-color)); }
      .oneHour > li:first-child { border-top-left-radius: 5px; border-bottom-left-radius: 5px; }
      .oneHour > li:last-child { border-top-right-radius: 5px; border-bottom-right-radius: 5px; border: 0; }

      .ecowatt-00, .ecowatt-01, .ecowatt-02, .ecowatt-03, .ecowatt-04, .ecowatt-05, .ecowatt-06, .ecowatt-07 { flex: 2 1 0; }
      .ecowatt-08, .ecowatt-09, .ecowatt-10, .ecowatt-11, .ecowatt-12, .ecowatt-13, .ecowatt-14, .ecowatt-15 { flex: 2 1 0; }
      .ecowatt-16, .ecowatt-17, .ecowatt-18, .ecowatt-19, .ecowatt-20, .ecowatt-21, .ecowatt-22, .ecowatt-23 { flex: 2 1 0; }

      .oneHourLabel > li:first-child { flex: 0.70 1 0; }
      .oneHourLabel > li { flex: 1 1 0; text-align: left; }

      .tempo-days, .tempo-color, .tempoborder-color { width:100%; border-spacing:2px; }
      .tempo-blue { color: white; text-align: center; background: #009dfa; border: 2px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow,none); text-transform: capitalize; }
      .tempoday-blue { color: #009dfa; font-weight: bold; text-align: center; background: var(--ha-card-background, var(--card-background-color, white)); box-shadow: var(--ha-card-box-shadow,none); text-transform: capitalize; }
      .tempo-white { color: #002654; text-align: center; background: white; border: 2px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow,none); text-transform: capitalize; }
      .tempoday-white { font-weight: bold; text-align: center; text-transform: capitalize; }
      .tempoday-grey { font-weight: bold; background: grey; text-align: center; text-transform: capitalize; }
      .tempo-red { color: white; text-align: center; background: #ff2700; border: 2px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow,none); text-transform: capitalize; }
      .tempoday-red { color: #ff2700; font-weight: bold; text-align: center; background: var(--ha-card-background, var(--card-background-color, white)); box-shadow: var(--ha-card-box-shadow,none); text-transform: capitalize; }
      .tempo-grey { color: #002654; text-align: center; background: grey; border: 2px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow,none);
        background-image: linear-gradient(45deg, #d6d6d6 25%, #dedede 25%, #dedede 50%, #d6d6d6 50%, #d6d6d6 75%, #dedede 75%, #dedede 100%);
        background-size: 28.28px 28.28px; text-transform: capitalize; }
    `;
  }
}
customElements.define('content-card-linky-tic', ContentCardLinkyTic);
