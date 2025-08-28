/* content-card-linky-tic-editor.js
   Editeur pour la carte : placeholders et champs pour ESPhome index sensors
*/

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

if (!customElements.get("ha-switch") && customElements.get("paper-toggle-button")) {
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
    this._config = { ...config };
  }

  static get properties() {
    return { hass: {}, _config: {} };
  }

  firstUpdated() {
    HELPERS.then(help => {
      if (help.importMoreInfoControl) help.importMoreInfoControl("fan");
    });
  }

  // getters with defaults + placeholders
  get _entity() { return this._config.entity || ""; }
  get _esphomeEntity() { return this._config.esphomeEntity || ""; }
  get _ewEntity() { return this._config.ewEntity || ""; }
  get _ewEntityJ1() { return this._config.ewEntityJ1 || ""; }
  get _ewEntityJ2() { return this._config.ewEntityJ2 || ""; }
  get _tempoEntityInfo() { return this._config.tempoEntityInfo || ""; }
  get _tempoEntityJ0() { return this._config.tempoEntityJ0 || ""; }
  get _tempoEntityJ1() { return this._config.tempoEntityJ1 || ""; }

  // New Tempo Index fields
  get _linkyTempoIndexBBRHCJW() { return this._config.linkyTempoIndexBBRHCJW || ""; }
  get _linkyTempoIndexBBRHPJW() { return this._config.linkyTempoIndexBBRHPJW || ""; }
  get _linkyTempoIndexBBRHCJB() { return this._config.linkyTempoIndexBBRHCJB || ""; }
  get _linkyTempoIndexBBRHPJB() { return this._config.linkyTempoIndexBBRHPJB || ""; }
  get _linkyTempoIndexBBRHCJR() { return this._config.linkyTempoIndexBBRHCJR || ""; }
  get _linkyTempoIndexBBRHPJR() { return this._config.linkyTempoIndexBBRHPJR || ""; }
  
  get _nbJoursAffichage() { return this._config.nbJoursAffichage || 7; }
  get _titleName() { return this._config.titleName || "LINKY"; }
  get _showHistory() { return this._config.showHistory !== false; }
  get _showTempo() { return this._config.showTempo !== false; }
  get _showTempoIndex() { return this._config.showTempoIndex !== false; } // Added this getter
  get _showEcoWatt() { return this._config.showEcoWatt !== false; }

  render() {
    if (!this.hass) return html``;
    return html`
      <div class="card-config">
        <div>
          ${this.renderTextField("Titre", this._titleName, "titleName")}
          ${this.renderSensorPicker("Entité myElectricalData (optionnelle)", this._entity, "entity")}
          ${this.renderSensorPicker("Entité ESPhome résumé (optionnelle)", this._esphomeEntity, "esphomeEntity")}
          <hr />
          <div><strong>ESPhome index sensors (placeholders)</strong></div>
          <div class="help">Entrer les capteurs d'index cumulés (ex: sensor.linky_hpjb_index)</div>

          ${this.renderTextField("Index HP JB (esphomeIndexes.hpjb)", this._config?.esphomeIndexes?.hpjb || "", "esphomeIndexes.hpjb")}
          ${this.renderTextField("Index HC JB (esphomeIndexes.hcjb)", this._config?.esphomeIndexes?.hcjb || "", "esphomeIndexes.hcjb")}
          ${this.renderTextField("Index HP JW (esphomeIndexes.hpjw)", this._config?.esphomeIndexes?.hpjw || "", "esphomeIndexes.hpjw")}
          ${this.renderTextField("Index HC JW (esphomeIndexes.hcjw)", this._config?.esphomeIndexes?.hcjw || "", "esphomeIndexes.hcjw")}
          ${this.renderTextField("Index HP JR (esphomeIndexes.hpjr)", this._config?.esphomeIndexes?.hpjr || "", "esphomeIndexes.hpjr")}
          ${this.renderTextField("Index HC JR (esphomeIndexes.hcjr)", this._config?.esphomeIndexes?.hcjr || "", "esphomeIndexes.hcjr")}

          <div class="help">Si possible, renseigner les capteurs d'index correspondant à la fin de la journée précédente pour permettre le calcul de consommation journalière.</div>
          ${this.renderTextField("Prev Index HP JB (esphomePrevIndexes.hpjb)", this._config?.esphomePrevIndexes?.hpjb || "", "esphomePrevIndexes.hpjb")}
          ${this.renderTextField("Prev Index HC JB (esphomePrevIndexes.hcjb)", this._config?.esphomePrevIndexes?.hcjb || "", "esphomePrevIndexes.hcjb")}
          ${this.renderTextField("Prev Index HP JW (esphomePrevIndexes.hpjw)", this._config?.esphomePrevIndexes?.hpjw || "", "esphomePrevIndexes.hpjw")}
          ${this.renderTextField("Prev Index HC JW (esphomePrevIndexes.hcjw)", this._config?.esphomePrevIndexes?.hcjw || "", "esphomePrevIndexes.hcjw")}
          ${this.renderTextField("Prev Index HP JR (esphomePrevIndexes.hpjr)", this._config?.esphomePrevIndexes?.hpjr || "", "esphomePrevIndexes.hpjr")}
          ${this.renderTextField("Prev Index HC JR (esphomePrevIndexes.hcjr)", this._config?.esphomePrevIndexes?.hcjr || "", "esphomePrevIndexes.hcjr")}

          <hr />
          ${this.renderSensorPicker("EcoWatt J0 (sensor)", this._ewEntity, "ewEntity")}
          ${this.renderSensorPicker("EcoWatt J+1", this._ewEntityJ1, "ewEntityJ1")}
          ${this.renderSensorPicker("EcoWatt J+2", this._ewEntityJ2, "ewEntityJ2")}

          ${this.renderSensorPicker("Tempo Info (sensor)", this._tempoEntityInfo, "tempoEntityInfo")}
          ${this.renderSensorPicker("Tempo J0 (sensor)", this._tempoEntityJ0, "tempoEntityJ0")}
          ${this.renderSensorPicker("Tempo J1 (sensor)", this._tempoEntityJ1, "tempoEntityJ1")}
          
          <hr />
          <div><strong>Capteurs d'index Tempo (pour l'affichage sur 3 lignes)</strong></div>
          ${this.renderSensorPicker("Index HP Blanc (JW)", this._linkyTempoIndexBBRHPJW, "linkyTempoIndexBBRHPJW")}
          ${this.renderSensorPicker("Index HC Blanc (JW)", this._linkyTempoIndexBBRHCJW, "linkyTempoIndexBBRHCJW")}
          ${this.renderSensorPicker("Index HP Bleu (JB)", this._linkyTempoIndexBBRHPJB, "linkyTempoIndexBBRHPJB")}
          ${this.renderSensorPicker("Index HC Bleu (JB)", this._linkyTempoIndexBBRHCJB, "linkyTempoIndexBBRHCJB")}
          ${this.renderSensorPicker("Index HP Rouge (JR)", this._linkyTempoIndexBBRHPJR, "linkyTempoIndexBBRHPJR")}
          ${this.renderSensorPicker("Index HC Rouge (JR)", this._linkyTempoIndexBBRHCJR, "linkyTempoIndexBBRHCJR")}
          
          <hr />

          ${this.renderSelectField("Nombre jours affichés", "nbJoursAffichage", [{value:1,label:"1"},{value:2,label:"2"},{value:3,label:"3"},{value:4,label:"4"},{value:5,label:"5"},{value:6,label:"6"},{value:7,label:"7"}], this._nbJoursAffichage)}
          <ul class="switches">
            ${this.renderSwitchOption("Afficher Historique", this._showHistory, "showHistory")}
            ${this.renderSwitchOption("Afficher Tempo", this._showTempo, "showTempo")}
            ${this.renderSwitchOption("Afficher Index Tempo", this._showTempoIndex, "showTempoIndex")}
            ${this.renderSwitchOption("Afficher EcoWatt", this._showEcoWatt, "showEcoWatt")}
          </ul>
        </div>
      </div>
    `;
  }

  // generic renderers
  renderSensorPicker(label, entity, configAttr) {
    return html`
      <ha-entity-picker
        label="${label}"
        .hass="${this.hass}"
        .value="${entity}"
        .configValue="${configAttr}"
        .includeDomains="sensor"
        @change="${this._valueChanged}"
        allow-custom-entity
      ></ha-entity-picker>
    `;
  }

  renderTextField(label, value, configAttr) {
    // support nested config keys like "esphomeIndexes.hpjb" -> we handle in _valueChanged
    const cv = configAttr;
    return html`
      <ha-textfield
        label="${label}"
        .value="${value || ''}"
        .configValue="${cv}"
        @input="${this._valueChanged}"
      ></ha-textfield>
    `;
  }

  renderSwitchOption(label, state, configAttr) {
    return html`
      <li class="switch">
        <ha-switch .checked=${state} .configValue="${configAttr}" @change="${this._valueChanged}"></ha-switch>
        <span>${label}</span>
      </li>
    `;
  }

  renderSelectField(label, config_key, options, value) {
    const opts = options.map(o => html`<mwc-list-item value="${o.value}">${o.label}</mwc-list-item>`);
    return html`
      <ha-select label="${label}" .value="${value}" .configValue="${config_key}" @change="${this._valueChanged}">
        ${opts}
      </ha-select>
    `;
  }

  _valueChanged(ev) {
    if (!this._config) return;
    const target = ev.target;
    const key = target.configValue;
    let value = (target.checked !== undefined) ? target.checked : (target.value !== undefined ? target.value : ev.detail?.value);
    
    // Check if the value is a boolean for switches and handle it correctly
    if (typeof value === "string") {
        if (value === "true") value = true;
        if (value === "false") value = false;
    }

    // support nested keys like "esphomeIndexes.hpjb"
    if (typeof key === "string" && key.includes(".")) {
      const parts = key.split(".");
      const top = parts.shift();
      const leaf = parts.join(".");
      const nested = { ...(this._config[top] || {}) };
      // set nested leaf (if further dot notation, we join remaining parts as key)
      nested[leaf] = value;
      this._config = { ...this._config, [top]: nested };
    } else {
      if (value === "") {
        delete this._config[key];
      } else {
        this._config = { ...this._config, [key]: value };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles() {
    return css`
      .card-config { padding: 12px; }
      .switches { list-style:none; padding:0; display:flex; flex-wrap:wrap; }
      .switch { width:50%; display:flex; align-items:center; }
      .help { font-size:0.85em; color:var(--secondary-text-color); margin-bottom:6px; }
      hr { border: 0; border-top: 1px solid var(--divider-color); margin:8px 0; }
    `;
  }
}

customElements.define("content-card-linky-tic-editor", contentCardLinkyTicEditor);
