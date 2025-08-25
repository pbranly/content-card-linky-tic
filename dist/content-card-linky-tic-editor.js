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

if (
  !customElements.get("ha-switch") &&
  customElements.get("paper-toggle-button")
) {
  customElements.define("ha-switch", customElements.get("paper-toggle-button"));
}

if (!customElements.get("ha-entity-picker")) {
  (customElements.get("hui-entities-card")).getConfigElement();
}

const LitElement = customElements.get("hui-masonry-view")
  ? Object.getPrototypeOf(customElements.get("hui-masonry-view"))
  : Object.getPrototypeOf(customElements.get("hui-view"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const HELPERS = window.loadCardHelpers();

export class contentCardLinkyTicEditor extends LitElement {
  setConfig(config) {
    this._config = { ...config }; // ✅ bon spread operator
  }

  static get properties() {
    return { hass: {}, _config: {} };
  }

  get _entity() {
    return this._config.entity || "";
  }

  // Nouveaux getters pour les capteurs linky_tempo
  get _sensorBBRHPJB() {
    return this._config.sensorBBRHPJB || "";
  }

  get _sensorBBRHCJB() {
    return this._config.sensorBBRHCJB || "";
  }

  get _sensorBBRHPJW() {
    return this._config.sensorBBRHPJW || "";
  }

  get _sensorBBRHCJW() {
    return this._config.sensorBBRHCJW || "";
  }

  get _sensorBBRHPJR() {
    return this._config.sensorBBRHPJR || "";
  }

  get _sensorBBRHCJR() {
    return this._config.sensorBBRHCJR || "";
  }

  // Getters pour les 6 tarifs tempo
  get _tarifTempoBleuHP() {
    return this._config.tarifTempoBleuHP || "0.1828";
  }

  get _tarifTempoBleuHC() {
    return this._config.tarifTempoBleuHC || "0.1344";
  }

  get _tarifTempoBlancHP() {
    return this._config.tarifTempoBlancHP || "0.1986";
  }

  get _tarifTempoBlancHC() {
    return this._config.tarifTempoBlancHC || "0.1508";
  }

  get _tarifTempoRougeHP() {
    return this._config.tarifTempoRougeHP || "0.7562";
  }

  get _tarifTempoRougeHC() {
    return this._config.tarifTempoRougeHC || "0.1508";
  }

  get _name() {
    return this._config.name || "";
  }

  get _showIcon() {
    return this._config.showIcon !== false;
  }

  get _showHeader() {
    return this._config.showHeader !== false;
  }

  get _showHistory() {
    return this._config.showHistory !== false;
  }

  get _showPeakOffPeak() {
    return this._config.showPeakOffPeak !== false;
  }

  get _showInTableUnit() {
    return this._config.showInTableUnit !== false;
  }

  get _showDayPrice() {
    return this._config.showDayPrice !== false;
  }

  get _showDayPriceHCHP() {
    return this._config.showDayPriceHCHP !== false;
  }

  get _showDayMaxPower() {
    return this._config.showDayMaxPower !== false;
  }

  get _showPrice() {
    return this._config.showPrice !== false;
  }

  get _showTitle() {
    return this._config.showTitle !== false;
  }

  get _showDayHCHP() {
    return this._config.showDayHCHP !== false;
  }

  get _showCurrentMonthRatio() {
    return this._config.showCurrentMonthRatio !== false;
  }

  get _showMonthRatio() {
    return this._config.showMonthRatio !== false;
  }

  get _showYearRatio() {
    return this._config.showYearRatio !== false;
  }

  get _showWeekRatio() {
    return this._config.showWeekRatio !== false;
  }

  get _showYesterdayRatio() {
    return this._config.showYesterdayRatio !== false;
  }

  get _showError() {
    return this._config.showError !== false;
  }

  get _showTitleLign() {
    return this._config.showTitleLign !== false;
  }

  get _showTempo() {
    return this._config.showTempo !== false;
  }

  get _showTempoColor() {
    return this._config.showTempoColor !== false;
  }

  get _title() {
    return this._config.showTitle !== false;
  }

  get _current() {
    return this._config.current !== false;
  }

  get _details() {
    return this._config.details !== false;
  }

  get _nbJoursAffichage() {
    return this._config.nbJoursAffichage || "7";
  }

  get _showDayName() {
    return this._config.showDayName || "long";
  }

  get _titleName() {
    return this._config.titleName || "LINKY";
  }

  firstUpdated() {
    HELPERS.then(help => {
      if (help.importMoreInfoControl) {
        help.importMoreInfoControl("fan");
      }
    })
  }

  render() {
    if (!this.hass) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div>
          ${this.renderTextField("Titre", this._titleName, "titleName")}
          ${this.renderSensorPicker("Entity principale", this._entity, "entity")}
          
          <!-- Section des capteurs linky_tempo -->
          <h3>Capteurs Linky Tempo</h3>
          ${this.renderSensorPicker("Index HP Jours Bleus (BBRHPJB)", this._sensorBBRHPJB, "sensorBBRHPJB")}
          ${this.renderSensorPicker("Index HC Jours Bleus (BBRHCJB)", this._sensorBBRHCJB, "sensorBBRHCJB")}
          ${this.renderSensorPicker("Index HP Jours Blancs (BBRHPJW)", this._sensorBBRHPJW, "sensorBBRHPJW")}
          ${this.renderSensorPicker("Index HC Jours Blancs (BBRHCJW)", this._sensorBBRHCJW, "sensorBBRHCJW")}
          ${this.renderSensorPicker("Index HP Jours Rouges (BBRHPJR)", this._sensorBBRHPJR, "sensorBBRHPJR")}
          ${this.renderSensorPicker("Index HC Jours Rouges (BBRHCJR)", this._sensorBBRHCJR, "sensorBBRHCJR")}
          
          <!-- Section des 6 tarifs tempo -->
          <h3>Configuration Tarifs Tempo (€/kWh)</h3>
          <div class="tarif-section">
            <h4>Jours Bleus</h4>
            ${this.renderNumberField("Tarif Bleu HP", this._tarifTempoBleuHP, "tarifTempoBleuHP")}
            ${this.renderNumberField("Tarif Bleu HC", this._tarifTempoBleuHC, "tarifTempoBleuHC")}
          </div>
          <div class="tarif-section">
            <h4>Jours Blancs</h4>
            ${this.renderNumberField("Tarif Blanc HP", this._tarifTempoBlancHP, "tarifTempoBlancHP")}
            ${this.renderNumberField("Tarif Blanc HC", this._tarifTempoBlancHC, "tarifTempoBlancHC")}
          </div>
          <div class="tarif-section">
            <h4>Jours Rouges</h4>
            ${this.renderNumberField("Tarif Rouge HP", this._tarifTempoRougeHP, "tarifTempoRougeHP")}
            ${this.renderNumberField("Tarif Rouge HC", this._tarifTempoRougeHC, "tarifTempoRougeHC")}
          </div>
          
          <!-- Configuration affichage -->
          <h3>Configuration Affichage</h3>
          ${this.renderSelectField("Nombre jours", "nbJoursAffichage", [
            {value: "1", label: "1"}, 
            {value: "2", label: "2"}, 
            {value: "3", label: "3"}, 
            {value: "4", label: "4"}, 
            {value: "5", label: "5"}, 
            {value: "6", label: "6"}, 
            {value: "7", label: "7"}
          ], this._nbJoursAffichage)}
          ${this.renderSelectField("Format jour", "showDayName", [
            {value: "long", label: "Long"}, 
            {value: "short", label: "Short"}, 
            {value: "narrow", label: "Narrow"}
          ], this._showDayName)}
          
          <!-- Options d'affichage -->
          <h3>Options d'Affichage</h3>
          <ul class="switches">
            ${this.renderSwitchOption("Afficher icône", this._showIcon, "showIcon")}
            ${this.renderSwitchOption("Afficher titre", this._showTitle, "showTitle")}
            ${this.renderSwitchOption("Afficher en-tête", this._showHeader, "showHeader")}
            ${this.renderSwitchOption("Afficher historique", this._showHistory, "showHistory")}
            ${this.renderSwitchOption("Afficher HC/HP", this._showPeakOffPeak, "showPeakOffPeak")}
            ${this.renderSwitchOption("Afficher unités", this._showInTableUnit, "showInTableUnit")}
            ${this.renderSwitchOption("Afficher prix journalier", this._showDayPrice, "showDayPrice")}
            ${this.renderSwitchOption("Afficher prix HC/HP", this._showDayPriceHCHP, "showDayPriceHCHP")}
            ${this.renderSwitchOption("Afficher prix total", this._showPrice, "showPrice")}
            ${this.renderSwitchOption("Afficher détail HC/HP par jour", this._showDayHCHP, "showDayHCHP")}
            ${this.renderSwitchOption("Afficher puissance max", this._showDayMaxPower, "showDayMaxPower")}
            ${this.renderSwitchOption("Afficher ratio année", this._showYearRatio, "showYearRatio")}
            ${this.renderSwitchOption("Afficher ratio mois", this._showCurrentMonthRatio, "showCurrentMonthRatio")}
            ${this.renderSwitchOption("Afficher ratio mois précédent", this._showMonthRatio, "showMonthRatio")}
            ${this.renderSwitchOption("Afficher ratio semaine", this._showWeekRatio, "showWeekRatio")}
            ${this.renderSwitchOption("Afficher ratio hier", this._showYesterdayRatio, "showYesterdayRatio")}
            ${this.renderSwitchOption("Afficher titres lignes", this._showTitleLign, "showTitleLign")}
            ${this.renderSwitchOption("Afficher erreurs", this._showError, "showError")}
            ${this.renderSwitchOption("Afficher Tempo", this._showTempo, "showTempo")}
            ${this.renderSwitchOption("Afficher couleurs Tempo", this._showTempoColor, "showTempoColor")}
          </ul>
        </div>
      </div>
    `;
  }

  renderSensorPicker(label, entity, configAttr) {
    return this.renderPicker(label, entity, configAttr, "sensor");
  }

  renderPicker(label, entity, configAttr, domain) {
    return html`<ha-entity-picker label="${label}" .hass="${this.hass}" .value="${entity}" .configValue="${configAttr}" .includeDomains="${domain}" @change="${this._valueChanged}" allow-custom-entity ></ha-entity-picker>`;
  }

  renderTextField(label, state, configAttr) {
    return this.renderField(label, state, configAttr, "text");
  }

  renderNumberField(label, state, configAttr) {
    return this.renderField(label, state, configAttr, "number");
  }

  renderField(label, state, configAttr, type) {
    return html`<ha-textfield label="${label}" .value="${state}" type="${type}" .configValue=${configAttr} @input=${this._valueChanged} ></ha-textfield>`;
  }

  renderSwitchOption(label, state, configAttr) {
    return html`<li class="switch"> <ha-switch .checked=${state} .configValue="${configAttr}" @change="${this._valueChanged}"> </ha-switch> <span>${label}</span> </li>`;
  }

  renderSelectField(label, config_key, options, value, default_value) {
    let selectOptions = [];
    for (let i = 0; i < options.length; i++) {
      let currentOption = options[i];
      selectOptions.push(html`<ha-list-item .value="${currentOption.value}">${currentOption.label}</ha-list-item>`);
    }

    return html`
      <ha-select
        label="${label}"
        .value=${value || default_value}
        .configValue=${config_key}                
        @change=${this._valueChanged}
        @closed=${(ev) => ev.stopPropagation()}
      >
        ${selectOptions}
      </ha-select>
    `;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue];
      } else {
        this._config = {
          ...this._config, // ✅ bon spread operator
          [target.configValue]:
            target.checked !== undefined ? target.checked : target.value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles() {
    return css`
      .card-config {
        padding: 16px;
      }

      h3 {
        margin: 20px 0 10px 0;
        color: var(--primary-text-color);
        font-size: 1.1em;
        font-weight: 500;
      }
      
      h4 {
        margin: 15px 0 8px 0;
        color: var(--secondary-text-color);
        font-size: 1em;
        font-weight: 500;
      }
      
      .tarif-section {
        margin-bottom: 15px;
        padding: 10px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        background: var(--card-background-color);
      }
      
      .switches {
        margin: 8px 0;
        display: flex;
        flex-flow: row wrap;
        list-style: none;
        padding: 0;
      }
      
      .switch {
        display: flex;
        align-items: center;
        width: 50%;
        height: 40px;
      }
      
      .switches span {
        padding: 0 16px;
      }
      
      ha-entity-picker,
      ha-textfield,
      ha-select {
        width: 100%;
        margin-bottom: 8px;
      }
    `;
  }
}

customElements.define("content-card-linky-tic-editor", contentCardLinkyTicEditor);
