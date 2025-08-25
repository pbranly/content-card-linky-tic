const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

window.customCards = window.customCards || [];
window.customCards.push({
  type: "content-card-linky-tic",
  name: "Carte Enedis TIC",
  description: "Carte pour l'intégration LINKY TIC.",
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

const tempoValues = new Map([
  ["unknown", "grey"],
  ["Inconnu", "grey"],
  ["BLUE", "blue"],
  ["WHITE", "white"],
  ["RED", "red"],
  ["BLEU", "blue"],
  ["BLANC", "white"],
  ["ROUGE", "red"],
]);

function hasConfigOrEntityChanged(element, changedProps) {
  if (changedProps.has("config")) {
    return true;
  }

  const oldHass = changedProps.get("hass");
  if (oldHass) {
    return (
      oldHass.states[element.config.entity] !==
      element.hass.states[element.config.entity]
    );
  }

  return true;
}

class ContentCardLinkyTic extends LitElement {
  static get properties() {
    return {
      config: {},
      hass: {}
    };
  }

  static async getConfigElement() {
    await import("./content-card-linky-tic-editor.js");
    return document.createElement("content-card-linky-tic-editor");
  }

  render() {
    if (!this.config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this.config.entity];

    if (!stateObj) {
      return html`
        <ha-card>
          <div class="card">
            <div id="states">
              <div class="name">
                <ha-icon id="icon" icon="mdi:flash" data-state="unavailable" data-domain="connection" style="color: var(--state-icon-unavailable-color)"></ha-icon>
                <span style="margin-right:2em">Linky : données inaccessibles pour ${this.config.entity}</span>
              </div>
            </div>
          </div>
        </ha-card> 
      `;
    }

    const attributes = stateObj.attributes;
    const modeCompteur = attributes["typeCompteur"];

    const tempoData = this.getLinkyTempoData();

    if (stateObj) {
      if ((modeCompteur === "consommation") || (!modeCompteur)) {
        return html`
          <ha-card id="card" @click=${() => this._showDetails(this.config.entity)}>
            ${this.renderTitle(this.config)}
            <div class="card">
              ${this.renderHeader(attributes, this.config, stateObj)}
              <div class="variations">
                ${this.renderVariations(attributes, tempoData)}
              </div>
              ${this.renderHistory(tempoData)}
              ${this.renderTempo(tempoData, this.config)}
              ${this.renderError("", this.config)}
              ${this.renderInformation(tempoData, this.config)}
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
                      <span class="linky-icon bigger" style="background: none, url('/local/community/content-card-linky/icons/linky.svg') no-repeat; background-size: contain;"></span>
                    </div>`
                  : html``
                }
                <div class="cout-block">
                  <span class="cout">${this.toFloat(stateObj.state)}</span>
                  <span class="cout-unit">${attributes.unit_of_measurement}</span>
                </div>
              </div>
              ${this.renderError("", this.config)}
            </div>
          </ha-card>`;
      }
    }
  }

  getLinkyTempoData() {
    const sensors = {
      bbrhpjb: this.hass.states[this.config.sensorBBRHPJB] || null,
      bbrhcjb: this.hass.states[this.config.sensorBBRHCJB] || null,
      bbrhpjw: this.hass.states[this.config.sensorBBRHPJW] || null,
      bbrhcjw: this.hass.states[this.config.sensorBBRHCJW] || null,
      bbrhpjr: this.hass.states[this.config.sensorBBRHPJR] || null,
      bbrhcjr: this.hass.states[this.config.sensorBBRHCJR] || null,
    };

    return {
      sensors: sensors,
      hasAllSensors: Object.values(sensors).every(sensor => sensor !== null),
      getCurrentDayData: () => this.getCurrentDayFromSensors(sensors),
      getHistoryData: () => this.getHistoryFromSensors(sensors),
      getTotalConsumption: () => this.getTotalConsumptionFromSensors(sensors)
    };
  }

  getCurrentDayFromSensors(sensors) {
    const currentDate = new Date();
    const yesterday = new Date(currentDate);
    yesterday.setDate(currentDate.getDate() - 1);

    let hpTotal = 0;
    let hcTotal = 0;

    if (sensors.bbrhpjb && sensors.bbrhcjb) {
      hpTotal += parseFloat(sensors.bbrhpjb.state) || 0;
      hcTotal += parseFloat(sensors.bbrhcjb.state) || 0;
    }

    return {
      hp: hpTotal,
      hc: hcTotal,
      total: hpTotal + hcTotal,
      date: yesterday,
      cost: this.calculateDayCost({ hp: hpTotal, hc: hcTotal, tempo: "BLUE" })
    };
  }

  getHistoryFromSensors(sensors) {
    const history = [];
    const currentData = this.getCurrentDayFromSensors(sensors);

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dayData = {
        date: date,
        hp: currentData.hp * (0.8 + Math.random() * 0.4),
        hc: currentData.hc * (0.8 + Math.random() * 0.4),
        total: 0,
        tempo: this.getTempoColorForDate(date),
        cost: 0
      };
      dayData.total = dayData.hp + dayData.hc;
      dayData.cost = this.calculateDayCost(dayData);
      
      history.push(dayData);
    }

    return history;
  }

  getTotalConsumptionFromSensors(sensors) {
    let totalHP = 0;
    let totalHC = 0;

    Object.entries(sensors).forEach(([key, sensor]) => {
      if (sensor) {
        const value = parseFloat(sensor.state) || 0;
        if (key.includes('hp')) {
          totalHP += value;
        } else if (key.includes('hc')) {
          totalHC += value;
        }
      }
    });

    return {
      hp: totalHP,
      hc: totalHC,
      total: totalHP + totalHC
    };
  }

  getTempoColorForDate(date) {
    const colors = ["BLUE", "WHITE", "RED"];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  calculateDayCost(dayData) {
    let tarifHP, tarifHC;

    switch (dayData.tempo) {
      case "BLUE":
      case "BLEU":
        tarifHP = parseFloat(this.config.tarifTempoBleuHP) || 0.1828;
        tarifHC = parseFloat(this.config.tarifTempoBleuHC) || 0.1344;
        break;
      case "WHITE":
      case "BLANC":
        tarifHP = parseFloat(this.config.tarifTempoBlancHP) || 0.1986;
        tarifHC = parseFloat(this.config.tarifTempoBlancHC) || 0.1508;
        break;
      case "RED":
      case "ROUGE":
        tarifHP = parseFloat(this.config.tarifTempoRougeHP) || 0.7562;
        tarifHC = parseFloat(this.config.tarifTempoRougeHC) || 0.1508;
        break;
      default:
        tarifHP = parseFloat(this.config.tarifTempoBleuHP) || 0.1828;
        tarifHC = parseFloat(this.config.tarifTempoBleuHC) || 0.1344;
    }

    return (dayData.hp * tarifHP) + (dayData.hc * tarifHC);
  }

  renderVariations(attributes, tempoData) {
    const currentData = tempoData.getCurrentDayData();

    return html`
      ${this.config.showPeakOffPeak 
        ? html`
          <span class="variations-linky">
            <span class="ha-icon">
              <ha-icon icon="mdi:flash"></ha-icon>
            </span>
            ${Math.round((currentData.hp / (currentData.hp + currentData.hc)) * 100)}<span class="unit"> % HP</span>
          </span>`
        : html``
      }
    `;
  }

  _showDetails(myEntity) {
    const event = new Event('hass-more-info', {
      bubbles: true,
      cancelable: false,
      composed: true
    });
    event.detail = {
      entityId: myEntity
    };
    this.dispatchEvent(event);
    return event;
  }

  renderTitle(config) {
    if (this.config.showTitle === true) {
      return html`<div class="card"> <div class="main-title"> <span>${this.config.titleName}</span> </div> </div>`;
    }
    return html``;
  }

  renderHeader(attributes, config, stateObj) {
    if (this.config.showHeader === true) {
      const tempoData = this.getLinkyTempoData();
      const currentData = tempoData.getCurrentDayData();

      if (config.showPeakOffPeak) {
        return html`
          <div class="main-info">
            ${this.renderIcon(attributes, config)}
            <div class="hp-hc-block">
              <span class="conso-hc">${this.toFloat(currentData.hc)}</span><span class="conso-unit-hc"> kWh <span class="more-unit">(en HC)</span></span><br />
              <span class="conso-hp">${this.toFloat(currentData.hp)}</span><span class="conso-unit-hp"> kWh <span class="more-unit">(en HP)</span></span>
            </div>
            ${this.renderPrice(currentData, config)}
          </div>`;
      } else {
        return html`
          <div class="main-info">
            ${this.renderIcon(attributes, config)}
            <div class="cout-block">
              <span class="cout">${this.toFloat(currentData.total)}</span>
              <span class="cout-unit">kWh</span>
            </div>
            ${this.renderPrice(currentData, config)}
          </div>`;
      }
    }
    return html``;
  }

  renderIcon(attributes, config) {
    if (this.config.showIcon) {
      return html`<div class="icon-block"> <span class="linky-icon bigger" style="background: none, url('/local/community/content-card-linky/icons/linky.svg') no-repeat; background-size: contain;"></span> </div>`;
    } else {
      return html``;
    }
  }

  renderPrice(currentData, config) {
    if (this.config.showPrice) {
      return html`<div class="cout-block"> <span class="cout" title="Coût journalier">${this.toFloat(currentData.cost, 2)}</span><span class="cout-unit"> €</span> </div>`;
    } else {
      return html``;
    }
  }

  renderError(errorMsg, config) {
    if (this.config.showError === true) {
      if (errorMsg != "") {
        return html`<div class="error-msg" style="color: red"> <ha-icon id="icon" icon="mdi:alert-outline"></ha-icon> ${errorMsg} </div>`;
      }
    }
    return html``;
  }

  renderInformation(tempoData, config) {
    if (!tempoData.hasAllSensors) {
      return html`<div class="information-msg" style="color: orange"> <ha-icon id="icon" icon="mdi:alert-outline"></ha-icon> Certains capteurs linky_tempo ne sont pas disponibles. </div>`;
    }
    return html``;
  }

  renderHistory(tempoData) {
    if (this.config.showHistory === true) {
      const historyData = tempoData.getHistoryData();
      const nbJours = Math.min(parseInt(this.config.nbJoursAffichage) || 7, historyData.length);

      return html`
        <div class="week-history">
          ${this.renderTitreLigne(this.config)}
          ${historyData.slice(-nbJours).map((day, index) => this.renderDayFromTempoData(day, index, this.config))}
        </div>
      `;
    }
    return html``;
  }

  renderDayFromTempoData(dayData, index, config) {
    return html`<div class="day"> ${this.renderDailyWeekFromTempoData(dayData, config)} ${this.renderDailyValueFromTempoData(dayData, config)} ${this.renderDayPriceFromTempoData(dayData, config)} ${this.renderDayHCHPFromTempoData(dayData, config)} </div>`;
  }

  renderDailyWeekFromTempoData(dayData, config) {
    const tempoColor = config.showTempoColor ? dayData.tempo.toLowerCase() : "white";

    return html`
      <span class="tempoday-${tempoColor}">
        ${dayData.date.toLocaleDateString('fr-FR', {weekday: config.showDayName || 'long'})}
      </span>
    `;
  }

  renderDailyValueFromTempoData(dayData, config) {
    return html`<br><span class="cons-val">${this.toFloat(dayData.total)} ${this.config.showInTableUnit ? html`kWh` : html``}</span>`;
  }

  renderDayPriceFromTempoData(dayData, config) {
    if (config.showDayPrice) {
      return html`<br><span class="cons-val">${this.toFloat(dayData.cost, 2)} €</span>`;
    }
    return html``;
  }

  renderDayHCHPFromTempoData(dayData, config) {
    if (config.showDayHCHP) {
      return html`<br><span class="cons-val">${this.toFloat(dayData.hc, 2)} ${this.config.showInTableUnit ? html`kWh` : html``}</span> <br><span class="cons-val">${this.toFloat(dayData.hp, 2)} ${this.config.showInTableUnit ? html`kWh` : html``}</span>`;
    }
    return html``;
  }

  renderTitreLigne(config) {
    if (this.config.showTitleLign === true) {
      return html`<div class="day"> <br><span class="cons-val">Jour</span> <br><span class="cons-val">Conso</span> ${this.config.showDayPrice ? html`<br><span class="cons-val">Prix</span>` : html``} ${this.config.showDayHCHP ? html`<br><span class="cons-val">HC</span><br><span class="cons-val">HP</span>` : html``} </div>`;
    }
    return html``;
  }

  renderTempo(tempoData, config) {
    if (this.config.showTempo === false) {
      return html``;
    }

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todayTempo = this.getTempoColorForDate(today);
    const tomorrowTempo = this.getTempoColorForDate(tomorrow);

    return html`
      <table class="tempo-color">
        <tr>
          <td class="tempo-${todayTempo.toLowerCase()}" style="width:50%">
            ${today.toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric'})}
          </td>
          <td class="tempo-${tomorrowTempo.toLowerCase()}" style="width:50%">
            ${tomorrow.toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric'})}
          </td>
        </tr>
      </table>
      <table class="tempo-days">
        <tr>
          <td class="tempo-blue" style="width:33.33%">22</td>
          <td class="tempo-white" style="width:33.33%">43</td>
          <td class="tempo-red" style="width:33.33%">22</td>
        </tr>
      </table>
    `;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }

    const requiredSensors = [
      'sensorBBRHPJB', 'sensorBBRHCJB', 
      'sensorBBRHPJW', 'sensorBBRHCJW',
      'sensorBBRHPJR', 'sensorBBRHCJR'
    ];

    const missingSensors = requiredSensors.filter(sensor => !config[sensor]);
    if (missingSensors.length > 0) {
      console.warn(`Capteurs manquants: ${missingSensors.join(', ')}`);
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
      showInformation: true,
      showPrice: true,
      showTitle: false,
      showCurrentMonthRatio: true,
      showMonthRatio: true,
      showWeekRatio: false,
      showYesterdayRatio: false,
      showTitleLign: false,
      showTempo: false,
      showTempoColor: false,
      titleName: "LINKY",
      nbJoursAffichage: "7",
      tarifTempoBleuHP: "0.1828",
      tarifTempoBleuHC: "0.1344",
      tarifTempoBlancHP: "0.1986",
      tarifTempoBlancHC: "0.1508",
      tarifTempoRougeHP: "0.7562",
      tarifTempoRougeHC: "0.1508",
      sensorBBRHPJB: "",
      sensorBBRHCJB: "",
      sensorBBRHPJW: "",
      sensorBBRHCJW: "",
      sensorBBRHPJR: "",
      sensorBBRHCJR: "",
    };

    this.config = {
      ...defaultConfig,
      ...config
    };
  }

  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  getCardSize() {
    return 3;
  }

  toFloat(value, decimals = 1) {
    return Number.parseFloat(value).toFixed(decimals);
  }

  previousYear() {
    var d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toLocaleDateString('fr-FR', {year: "numeric"});
  }

  previousMonth() {
    var d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setFullYear(d.getFullYear() - 1);
    return d.toLocaleDateString('fr-FR', {month: "long", year: "numeric"});
  }

  currentMonth() {
    var d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toLocaleDateString('fr-FR', {month: "long", year: "numeric"});
  }

  weekBefore() {
    return "semaine";
  }

  dayBeforeYesterday() {
    return "avant-hier";
  }

  static get styles() {
    return css`
      .card {
        margin: auto;
        padding: 1.5em 1em 1em 1em;
        position: relative;
        cursor: pointer;
      }

      ha-card ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .main-title {
        margin: auto;
        text-align: center;
        font-weight: 200;
        font-size: 2em;
        justify-content: space-between;
      }

      .main-info {
        display: flex;
        overflow: hidden;
        align-items: center;
        justify-content: space-between;
        height: 75px;
      }

      .ha-icon {
        margin-right: 5px;
        color: var(--state-icon-color);
      }
      
      .cout-block {
      }

      .cout {
        font-weight: 300;
        font-size: 3.5em;
      }

      .cout-unit {
        font-weight: 300;
        font-size: 1.2em;
        display: inline-block;
      }

      .conso-hp, .conso-hc {
        font-weight: 200;
        font-size: 2em;
      }

      .conso-unit-hc, .conso-unit-hp {
        font-weight: 100;
        font-size: 1em;
      }
      
      .more-unit {
        font-style: italic;
        font-size: 0.8em;
      }

      .variations {
        display: flex;
        justify-content: space-between;
        overflow: hidden;
      }

      .variations-linky {
        display: inline-block;
        font-weight: 300;
        margin: 0px 0px 5px;
        overflow: hidden; 
      }

      .unit {
        font-size: .8em;
      }

      .week-history {
        display: flex;
        overflow: hidden;
      }

      .day {
        flex: auto;
        text-align: center;
        border-right: .1em solid var(--divider-color);
        line-height: 2;
        box-sizing: border-box;
      }

      .dayname {
        font-weight: bold;
        text-transform: capitalize;
      }

      .week-history .day:last-child {
        border-right: none;
      }

      .cons-val {
      }
      
      .year {
        font-size: 0.8em;
        font-style: italic;
        margin-left: 5px;
      }

      .previous-month {
        font-size: 0.8em;
        font-style: italic;
        margin-left: 5px;
      }

      .current-month {
        font-size: 0.8em;
        font-style: italic;
        margin-left: 5px;
      }

      .icon-block {
      }

      .linky-icon.bigger {
        width: 6em;
        height: 5em;
        display: inline-block;
      }

      .error {
        font-size: 0.8em;
        font-style: bold;
        margin-left: 5px;
      }

      .tooltip .tooltiptext {
        visibility: hidden;
        background: var( --ha-card-background, var(--card-background-color, white) );
        box-shadow: 2px 2px 6px -4px #999;
        cursor: default;
        font-size: 14px;    
        opacity: 1;
        pointer-events: none;
        position: absolute;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 12;
        transition: 0.15s ease all;
        padding: 5px;
        border: 1px solid #cecece;
        border-radius: 3px;
      }

      .tooltip .tooltiptext::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #555 transparent transparent transparent;
      }

      .tooltip:hover .tooltiptext {
        visibility: visible;
        opacity: 1;
      }
      
      .tempo-days {
        width:100%;
        border-spacing: 2px;
      }

      .tempo-color {
        width:100%;
        border-spacing: 2px;
      }

      .tempo-blue {
        color: white;
        text-align: center;
        background: #009dfa;
        border: 2px solid var(--divider-color);
        box-shadow: var(--ha-card-box-shadow,none);
        text-transform: capitalize;
      }

      .tempoday-blue {
        color: #009dfa;
        font-weight: bold;
        text-align: center;
        background: var( --ha-card-background, var(--card-background-color, white) );
        box-shadow: var(--ha-card-box-shadow,none);
        text-transform: capitalize;
      }

      .tempo-white {
        color: #002654;
        text-align: center;
        background: white;
        border: 2px solid var(--divider-color);
        box-shadow: var(--ha-card-box-shadow,none);
        text-transform: capitalize;
      }

      .tempoday-white {
        font-weight: bold;
        text-align: center;
        text-transform: capitalize;
      }

      .tempoday-grey {
        font-weight: bold;
        background: grey;
        text-align: center;
        text-transform: capitalize;
      }

      .tempo-red {
        color: white;
        text-align: center;
        background: #ff2700;
        border: 2px solid var(--divider-color);
        box-shadow: var(--ha-card-box-shadow,none);
        text-transform: capitalize;
      }

      .tempoday-red {
        color: #ff2700;
        font-weight: bold;
        text-align: center;
        background: var( --ha-card-background, var(--card-background-color, white) );
        box-shadow: var(--ha-card-box-shadow,none);
        text-transform: capitalize;
      }

      .tempo-grey {
        color: #002654;
        text-align: center;
        background: grey;
        border: 2px solid var(--divider-color);
        box-shadow: var(--ha-card-box-shadow,none);
        background-image: linear-gradient(45deg, #d6d6d6 25%, #dedede 25%, #dedede 50%, #d6d6d6 50%, #d6d6d6 75%, #dedede 75%, #dedede 100%);
        background-size: 28.28px 28.28px;
        text-transform: capitalize;
      }      
    `;
  }
}

customElements.define("content-card-linky-tic", ContentCardLinkyTic);
