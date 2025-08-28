/* content-card-linky-tic.js
   Version adaptée : compatibilité myElectricalData OR ESPhome index sensors
   Placeholders / champs à configurer dans l'éditeur
*/

const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

window.customCards = window.customCards || [];
window.customCards.push({
  type: "content-card-linky-tic",
  name: "Carte Enedis Tic",
  description: "Carte pour l'intégration Esphome / myElectricalData (compatible)",
  preview: true,
  documentationURL: "https://github.com/pbranly/content-card-linky-tic",
});

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

function fireEvent(node, type, detail, options) {
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
}

function hasConfigOrEntityChanged(element, changedProps) {
  if (changedProps.has("config")) {
    return true;
  }
  const oldHass = changedProps.get("hass");
  if (oldHass) {
    // watch both configured entities (myelectricaldata OR esphome sensors)
    const cfg = element.config || {};
    const ent = cfg.entity;
    const esph = cfg.esphomeEntity;
    if (ent && oldHass.states[ent] !== element.hass.states[ent]) return true;
    if (esph && oldHass.states[esph] !== element.hass.states[esph]) return true;
    // also watch any explicitly configured index sensors
    if (cfg.esphomeIndexes) {
      for (const k of Object.keys(cfg.esphomeIndexes)) {
        const entId = cfg.esphomeIndexes[k];
        if (oldHass.states[entId] !== element.hass.states[entId]) return true;
      }
    }
    if (cfg.esphomePrevIndexes) {
      for (const k of Object.keys(cfg.esphomePrevIndexes)) {
        const entId = cfg.esphomePrevIndexes[k];
        if (oldHass.states[entId] !== element.hass.states[entId]) return true;
      }
    }
    // otherwise assume changed
    return false;
  }
  return true;
}

class ContentCardLinkyTic extends LitElement {
  static get properties() {
    return {
      config: {},
      hass: {},
    };
  }

  static async getConfigElement() {
    await import("./content-card-linky-tic-editor.js");
    return document.createElement("content-card-linky-tic-editor");
  }

  setConfig(config) {
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
      nbJoursAffichage: 7,
      // ESPhome index mapping placeholders (user fills via editor)
      esphomeEntity: undefined, // optional: an entity representing ESPhome summary (if any)
      esphomeIndexes: undefined, // example: { hpjb: "sensor.linky_hpjb_index", hcjb: "...", hpjw: "...", hcjw: "...", hpjr: "...", hcjr: "..." }
      esphomePrevIndexes: undefined, // same mapping but for "previous day" indexes (required to compute day consumption)
    };
    this.config = {
      ...defaultConfig,
      ...config,
    };
  }

  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  render() {
    if (!this.config || !this.hass) return html``;

    // prefer myElectricalData entity if defined and available
    const meEntity = this.config.entity;
    const meState = meEntity ? this.hass.states[meEntity] : undefined;
    // fallback: esphome summary entity (optional)
    const esphSummaryEntity = this.config.esphomeEntity ? this.hass.states[this.config.esphomeEntity] : undefined;

    // If neither main entity nor esphome summary exists, show message
    if (!meState && !esphSummaryEntity && !this.hasEsphomeIndexesConfigured()) {
      return html`
        <ha-card>
          <div class="card">
            <div class="name">
              <ha-icon icon="mdi:flash" style="color:var(--state-icon-unavailable-color)"></ha-icon>
              Données indisponibles. Configurez l'entité myElectricalData ou les index ESPhome.
            </div>
          </div>
        </ha-card>
      `;
    }

    // Build attributes that the original card expected.
    // If myElectricalData available -> use original attributes; else derive attributes (daily, dailyweek...) from ESPhome indexes where possible.
    let attributes = {};
    if (meState && meState.attributes) {
      attributes = meState.attributes;
      // ensure dailyweek (legacy naming) available or daily as fallback
    } else {
      attributes = this.buildAttributesFromEsphome();
    }

    // render
    const modeCompteur = attributes["typeCompteur"] || "consommation";
    if (modeCompteur === "production") {
      return html`${this._renderProduction(attributes)}`;
    } else {
      return html`${this._renderConsumption(attributes)}`;
    }
  }

  // ---------------- Helpers ----------------

  hasEsphomeIndexesConfigured() {
    return this.config.esphomeIndexes && Object.keys(this.config.esphomeIndexes).length > 0;
  }

  // Build minimal set of attributes expected by the card using ESPhome indexes if myElectricalData is not present.
  buildAttributesFromEsphome() {
    const attrs = {};
    // Unit and default values
    attrs.unit_of_measurement = this.config.unit_of_measurement || "kWh";

    // daily: array of last N daily consumptions — we'll compute only "today" if possible
    // dailyweek: array of dates for last N days
    const nb = Number(this.config.nbJoursAffichage) || 7;
    const today = new Date();
    const dailyDates = [];
    for (let i = nb - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      dailyDates.push(d.toISOString().split("T")[0]); // YYYY-MM-DD
    }
    attrs.dailyweek = dailyDates.join(",");

    // compute today's consumption from esphome indexes if mapping available
    // expected mapping keys: hpjb, hcjb, hpjw, hcjw, hpjr, hcjr (the six tempo indexes). Also generic "total" or "base" may be provided.
    const idxMap = this.config.esphomeIndexes || {};
    const prevMap = this.config.esphomePrevIndexes || {};
    const dailyValues = new Array(nb).fill(-1); // fill with -1 for missing data
    const tempoValuesArr = new Array(nb).fill("-1"); // tempo color per day optional

    // compute for "today" (last element)
    const lastIndexVals = {};
    const prevIndexVals = {};
    for (const key of Object.keys(idxMap)) {
      const ent = idxMap[key];
      if (ent && this.hass.states[ent] && this.hass.states[ent].state !== 'unknown' && this.hass.states[ent].state !== 'unavailable') {
        lastIndexVals[key] = parseFloat(this.hass.states[ent].state);
      }
    }
    for (const key of Object.keys(prevMap)) {
      const ent = prevMap[key];
      if (ent && this.hass.states[ent] && this.hass.states[ent].state !== 'unknown' && this.hass.states[ent].state !== 'unavailable') {
        prevIndexVals[key] = parseFloat(this.hass.states[ent].state);
      }
    }

    // If there is a 'total' channel (sum of HP+HC) compute difference; otherwise try to combine categories
    // Priority: if an index named 'total' (or 'base') exists, use it. Else sum sensible differences.
    let todayConsumption = -1;
    if (lastIndexVals.total !== undefined && prevIndexVals.total !== undefined) {
      todayConsumption = lastIndexVals.total - prevIndexVals.total;
    } else if (lastIndexVals.base !== undefined && prevIndexVals.base !== undefined) {
      todayConsumption = lastIndexVals.base - prevIndexVals.base;
    } else {
      // try to sum differences available among tempo categories
      const keysToTry = ["hpjb","hcjb","hpjw","hcjw","hpjr","hcjr","hpj","hcj"]; // allow variations
      let sum = 0;
      let any = false;
      for (const k of keysToTry) {
        if (lastIndexVals[k] !== undefined && prevIndexVals[k] !== undefined) {
          sum += (lastIndexVals[k] - prevIndexVals[k]);
          any = true;
        }
      }
      if (any) {
        todayConsumption = sum;
      }
    }

    // set today's consumption to last slot in dailyValues
    dailyValues[dailyValues.length - 1] = (todayConsumption >= 0 ? Number(todayConsumption.toFixed(3)) : -1);

    // Attempt: if there are provided per-day index sensors (e.g. index_YYYY_MM_DD), user can map them as previous indexes per day.
    // But in absence of that, we only present today's calculated consumption; others stay -1.

    attrs.daily = dailyValues.join(",");
    // set daily_cost placeholders
    attrs.dailyweek_cost = new Array(nb).fill(-1).join(",");
    attrs.dailyweek_HC = new Array(nb).fill(-1).join(",");
    attrs.dailyweek_HP = new Array(nb).fill(-1).join(",");
    attrs.dailyweek_Tempo = tempoValuesArr.join(",");
    return attrs;
  }

  // ---------- Render blocks (header, history, tempo, ecowatt, etc.) ----------

  _renderConsumption(attributes) {
    return html`
      <ha-card id="card">
        <div class="card" @click=${() => this._showDetails(this.config.entity || this.config.esphomeEntity)}>
          ${this.renderTitle(this.config)}
          ${this.renderHeader(attributes)}
          <div class="variations">
            ${this.renderVariations(attributes)}
          </div>
          ${this.renderHistoryBlock(attributes)}
          ${this.renderEcoWatt(attributes)}
          ${this.renderTempo(attributes)}
          ${this.renderError(attributes.errorLastCall)}
          ${this.renderVersion(attributes.versionUpdateAvailable, attributes.versionGit)}
        </div>
      </ha-card>
    `;
  }

  _renderProduction(attributes) {
    return html`
      <ha-card>
        <div class="card">
          <div class="main-info">
            ${this.config.showIcon ? html`<div class="icon-block"><span class="linky-icon bigger"></span></div>` : ""}
            <div class="cout-block">
              <span class="cout">${this.toFloat(attributes.current || 0)}</span>
              <span class="cout-unit">${attributes.unit_of_measurement || "kWh"}</span>
            </div>
          </div>
          ${this.renderError(attributes.errorLastCall)}
        </div>
      </ha-card>
    `;
  }

  renderTitle(config) {
    if (this.config.showTitle === true) {
      return html`
        <div class="card">
          <div class="main-title">
            <span>${this.config.titleName}</span>
          </div>
        </div>
      `;
    }
    return html``;
  }

  renderHeader(attributes) {
    if (!this.config.showHeader) return html``;
    if (this.config.showPeakOffPeak) {
      // try to show yesterday HC/HP if available in attributes, else placeholders
      const yesterday_HC = attributes.yesterday_HC !== undefined ? attributes.yesterday_HC : "-";
      const yesterday_HP = attributes.yesterday_HP !== undefined ? attributes.yesterday_HP : "-";
      return html`
        <div class="main-info">
          ${this.config.showIcon ? html`<div class="icon-block"><span class="linky-icon bigger"></span></div>` : ""}
          <div class="hp-hc-block">
            <span class="conso-hc">${this.toFloat(yesterday_HC)}</span><span class="conso-unit-hc"> ${attributes.unit_of_measurement || ""} <span class="more-unit">(en HC)</span></span><br />
            <span class="conso-hp">${this.toFloat(yesterday_HP)}</span><span class="conso-unit-hp"> ${attributes.unit_of_measurement || ""} <span class="more-unit">(en HP)</span></span>
          </div>
          ${this.renderPrice(attributes)}
        </div>
      `;
    } else {
      const mainVal = attributes.current || attributes.state || "-";
      return html`
        <div class="main-info">
          ${this.config.showIcon ? html`<div class="icon-block"><span class="linky-icon bigger"></span></div>` : ""}
          <div class="cout-block">
            <span class="cout">${this.toFloat(mainVal)}</span>
            <span class="cout-unit">${attributes.unit_of_measurement || ""}</span>
          </div>
          ${this.renderPrice(attributes)}
        </div>
      `;
    }
  }

  renderPrice(attributes) {
    if (!this.config.showPrice) return html``;
    const daily_cost = attributes.daily_cost !== undefined ? attributes.daily_cost : "-";
    return html`
      <div class="cout-block">
        <span class="cout" title="Coût journalier">${this.toFloat(daily_cost, 2)}</span><span class="cout-unit"> €</span>
      </div>
    `;
  }

  renderVariations(attributes) {
    // simplified variations rendering, use attributes if present
    return html`
      ${this.config.showYearRatio ? html`<span class="variations-linky">${Math.round(attributes.yearly_evolution||0)}%</span>` : ""}
      ${this.config.showMonthRatio ? html`<span class="variations-linky">${Math.round(attributes.monthly_evolution||0)}%</span>` : ""}
      ${this.config.showCurrentMonthRatio ? html`<span class="variations-linky">${Math.round(attributes.current_month_evolution||0)}%</span>` : ""}
      ${this.config.showWeekRatio ? html`<span class="variations-linky">${Math.round(attributes.current_week_evolution||0)}%</span>` : ""}
      ${this.config.showYesterdayRatio ? html`<span class="variations-linky">${Math.round(attributes.yesterday_evolution||0)}%</span>` : ""}
      ${this.config.showPeakOffPeak ? html`<span class="variations-linky">${Math.round(attributes.peak_offpeak_percent || 0)}% HP</span>` : ""}
    `;
  }

  renderHistoryBlock(attributes) {
    if (!this.config.showHistory) return html``;
    // attributes.daily expected as CSV or array; attributes.dailyweek contains comma-separated dates
    const dailyCsv = attributes.daily || "";
    const dailyArr = typeof dailyCsv === "string" ? dailyCsv.split(",") : (Array.isArray(dailyCsv) ? dailyCsv : []);
    const datesCsv = attributes.dailyweek || "";
    const dateArr = typeof datesCsv === "string" ? datesCsv.split(",") : [];

    const nb = Number(this.config.nbJoursAffichage) || 7;
    // create pairs from right to left (most recent last)
    const rows = [];
    for (let i = 0; i < nb; i++) {
      const idx = dailyArr.length - nb + i;
      const val = (idx >= 0 && dailyArr[idx] !== undefined) ? dailyArr[idx] : -1;
      const date = (idx >= 0 && dateArr[idx] !== undefined) ? dateArr[idx] : ( (() => {
        const d = new Date();
        d.setDate(d.getDate() - (nb - 1 - i));
        return d.toISOString().split("T")[0];
      })());
      rows.push({ date, val });
    }

    return html`
      <div class="week-history">
        ${this.renderTitreLigne(this.config)}
        ${rows.map(r => html`
          <div class="day">
            <div class="tempoday">${new Date(r.date).toLocaleDateString('fr-FR', {weekday: this.config.showDayName || 'long'})}</div>
            <div class="cons-val">${(r.val === -1) ? html`<ha-icon icon="mdi:alert-outline"></ha-icon>` : this.toFloat(r.val)}</div>
          </div>
        `)}
      </div>
    `;
  }

  renderEcoWatt(attributes) {
    if (!this.config.showEcoWatt) return html``;
    const sensorName = this.config.ewEntity;
    const sensorJ1 = this.config.ewEntityJ1;
    const sensorJ2 = this.config.ewEntityJ2;
    const ew = sensorName ? (this.hass.states[sensorName] || null) : null;
    const ew1 = sensorJ1 ? (this.hass.states[sensorJ1] || null) : null;
    const ew2 = sensorJ2 ? (this.hass.states[sensorJ2] || null) : null;

    // simple compact display to keep original style compatibility
    return html`
      <div class="ecowatt">
        <div>EcoWatt J0: ${ew ? (ew.state || "-") : "-"}</div>
        <div>EcoWatt J+1: ${ew1 ? (ew1.state || "-") : "-"}</div>
        <div>EcoWatt J+2: ${ew2 ? (ew2.state || "-") : "-"}</div>
      </div>
    `;
  }

  getTempoDateValue(tempoEntity) {
    if (!tempoEntity || !tempoEntity.attributes) return [new Date(), "grey", "unknown"];
    const tempoDate = new Date(tempoEntity.attributes["date"] || Date.now());
    const tempoValue = tempoEntity.state || "unknown";
    return [tempoDate, tempoValues.get(tempoValue) || "grey", tempoValue];
  }

  renderTempo(attributes) {
    if (!this.config.showTempo) return html``;
    // tempo info sensors configured in editor:
    const sensorNameInfo = this.config.tempoEntityInfo;
    const sensorJ0 = this.config.tempoEntityJ0;
    const sensorJ1 = this.config.tempoEntityJ1;
    const info = sensorNameInfo ? this.hass.states[sensorNameInfo] : null;
    const j0 = sensorJ0 ? this.hass.states[sensorJ0] : null;
    const j1 = sensorJ1 ? this.hass.states[sensorJ1] : null;

    if (!j0 || !j1) {
      return html`<div>Tempo : capteurs J0/J1 manquants</div>`;
    }

    const [dateJ0, valueJ0] = this.getTempoDateValue(j0);
    const [dateJ1, valueJ1] = this.getTempoDateValue(j1);

    const remaining = info ? [info.attributes?.days_red || "-", info.attributes?.days_white || "-", info.attributes?.days_blue || "-"] : ["-","-","-"];

    return html`
      <table class="tempo-color">
        <tr>
          <td class="tempo-${valueJ0}" style="width:50%">${new Date(dateJ0).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric'})}</td>
          <td class="tempo-${valueJ1}" style="width:50%">${new Date(dateJ1).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric'})}</td>
        </tr>
      </table>
      <table class="tempo-days">
        <tr>
          <td class="tempo-blue" style="width:33.33%">${remaining[2]}</td>
          <td class="tempo-white" style="width:33.33%">${remaining[1]}</td>
          <td class="tempo-red" style="width:33.33%">${remaining[0]}</td>
        </tr>
      </table>
    `;
  }

  renderError(errorMsg) {
    if (!this.config.showError) return html``;
    if (errorMsg && errorMsg !== "") {
      return html`<div class="error-msg" style="color:red"><ha-icon icon="mdi:alert-outline"></ha-icon>${errorMsg}</div>`;
    }
    return html``;
  }

  renderVersion(versionUpdateAvailable, versionGit) {
    if (!versionUpdateAvailable) return html``;
    return html`<div class="information-msg" style="color:red"><ha-icon icon="mdi:alert-outline"></ha-icon>Nouvelle version disponible ${versionGit}</div>`;
  }

  renderTitreLigne(config) {
    if (!this.config.showTitleLign) return html``;
    return html`
      <div class="day title-line">
        <div>Jour</div>
        <div>Conso</div>
        ${this.config.showDayPrice ? html`<div>Prix</div>` : ""}
      </div>
    `;
  }

  _showDetails(entity) {
    if (!entity) return;
    fireEvent(this, "hass-more-info", { entityId: entity });
  }

  // ---------- Utilities ----------
  toFloat(value, decimals = 1) {
    if (value === undefined || value === null || value === "-" || isNaN(value)) return "-";
    return Number.parseFloat(value).toFixed(decimals);
  }

  // ---------- Styles ----------
  static get styles() {
    return css`
      .card {
        margin: auto;
        padding: 1.5em 1em 1em 1em;
        position: relative;
        cursor: pointer;
      }
      .main-info { display:flex; justify-content:space-between; align-items:center; height:75px; }
      .cout { font-size: 2.5em; font-weight: 300; }
      .week-history { display:flex; gap:6px; margin-top:12px; }
      .day { flex:1; text-align:center; border-right: .1em solid var(--divider-color); padding:8px; }
      .day:last-child { border-right: none; }
      .tempo-days td, .tempo-color td { padding:6px; text-align:center; }
      .tempo-blue { background:#009dfa; color:#fff; }
      .tempo-white { background:#fff; color:#002654; border:1px solid var(--divider-color); }
      .tempo-red { background:#ff2700; color:#fff; }
      .error-msg { margin-top:8px; }
      .title-line { font-weight:600; }
    `;
  }
}

customElements.define("content-card-linky-tic", ContentCardLinkyTic);
