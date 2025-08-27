
/* content-card-linky-tic-editor.js
 * Editor pour content-card-linky-tic (version Tempo Index compatible)
 * Permet de renseigner soit une entité "entity" (capteur consommation),
 * soit une liste de 6 entités "tempo_entities" (index Tempo).
 */

const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class ContentCardLinkyTicEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {} };
  }

  setConfig(config) {
    this._config = {
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
      ...config
    };
  }

  _valueChanged(ev) {
    const target = ev.target;
    if (!this._config || !this.hass) return;
    const newConfig = { ...this._config };

    if (target.dataset?.field) {
      const field = target.dataset.field;
      if (target.type === "checkbox") {
        newConfig[field] = target.checked;
      } else if (target.type === "number") {
        const v = Number(target.value);
        newConfig[field] = Number.isNaN(v) ? undefined : v;
      } else {
        newConfig[field] = target.value;
      }
    }

    // tempo_entities[]
    if (target.dataset?.tempondx) {
      const idx = Number(target.dataset.tempondx);
      const arr = Array.isArray(newConfig.tempo_entities) ? [...newConfig.tempo_entities] : [];
      arr[idx] = target.value;
      newConfig.tempo_entities = arr;
    }

    this._config = newConfig;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  render() {
    if (!this.hass) return html``;
    const c = this._config || {};
    const tempo = c.tempo_entities || [];

    return html`
      <div class="card-config">
        <div class="row">
          <ha-entity-picker
            label="Entity (capteur consommation) — optionnel si tempo_entities"
            .hass=${this.hass}
            .value=${c.entity}
            .configValue=${"entity"}
            domain-filter="sensor"
            @value-changed=${(e)=>{ e.target.dataset = { field: "entity" }; this._valueChanged(e); }}
          ></ha-entity-picker>
        </div>

        <div class="row" style="margin-top:1em;">
          <div class="title">Capteurs Tempo (6 index) — utilisez ceux-ci à la place de 'entity'</div>
          ${[
            "BBRHCJB (HC Bleu)",
            "BBRHPJB (HP Bleu)",
            "BBRHCJW (HC Blanc)",
            "BBRHPJW (HP Blanc)",
            "BBRHCJR (HC Rouge)",
            "BBRHPJR (HP Rouge)",
          ].map((label, i) => html`
            <ha-entity-picker
              .hass=${this.hass}
              label=${label}
              .value=${tempo[i] || ""}
              domain-filter="sensor"
              @value-changed=${(e)=>{ e.target.dataset = { tempondx: String(i) }; this._valueChanged(e); }}
            ></ha-entity-picker>
          `)}
        </div>

        <div class="row two">
          <paper-input
            label="Titre"
            .value=${c.titleName || ""}
            @value-changed=${(e)=>{ e.target.dataset = { field: "titleName" }; this._valueChanged(e); }}
          ></paper-input>
          <mwc-switch
            title="Afficher le titre"
            ?checked=${c.showTitle === true}
            @change=${(e)=>{ e.target.dataset = { field: "showTitle" }; this._valueChanged(e); }}
          ></mwc-switch>
        </div>

        <div class="row two">
          <mwc-switch title="En-tête" ?checked=${c.showHeader === true} @change=${(e)=>{ e.target.dataset = { field: "showHeader" }; this._valueChanged(e); }}></mwc-switch>
          <mwc-switch title="Icône" ?checked=${c.showIcon === true} @change=${(e)=>{ e.target.dataset = { field: "showIcon" }; this._valueChanged(e); }}></mwc-switch>
        </div>

        <div class="row two">
          <mwc-switch title="HP/HC en-tête" ?checked=${c.showPeakOffPeak === true} @change=${(e)=>{ e.target.dataset = { field: "showPeakOffPeak" }; this._valueChanged(e); }}></mwc-switch>
          <mwc-switch title="% / Variations" ?checked=${c.showCurrentMonthRatio === true} @change=${(e)=>{ e.target.dataset = { field: "showCurrentMonthRatio" }; this._valueChanged(e); }}></mwc-switch>
        </div>

        <div class="row two">
          <mwc-switch title="Historique" ?checked=${c.showHistory === true} @change=${(e)=>{ e.target.dataset = { field: "showHistory" }; this._valueChanged(e); }}></mwc-switch>
          <paper-input
            type="number"
            label="Nb jours (historique)"
            .value=${c.nbJoursAffichage || "7"}
            @value-changed=${(e)=>{ e.target.dataset = { field: "nbJoursAffichage" }; this._valueChanged(e); }}
          ></paper-input>
        </div>

        <div class="row two">
          <mwc-switch title="Afficher prix journaliers" ?checked=${c.showDayPrice === true} @change=${(e)=>{ e.target.dataset = { field: "showDayPrice" }; this._valueChanged(e); }}></mwc-switch>
          <paper-input
            type="number"
            label="Prix kWh (si pas de coûts fournis)"
            .value=${c.kWhPrice || ""}
            @value-changed=${(e)=>{ e.target.dataset = { field: "kWhPrice" }; this._valueChanged(e); }}
          ></paper-input>
        </div>

        <div class="row">
          <div class="title">EcoWatt (facultatif)</div>
          <ha-entity-picker .hass=${this.hass} label="J+0" .value=${c.ewEntity || ""} domain-filter="sensor"
            @value-changed=${(e)=>{ e.target.dataset = { field: "ewEntity" }; this._valueChanged(e); }}></ha-entity-picker>
          <ha-entity-picker .hass=${this.hass} label="J+1" .value=${c.ewEntityJ1 || ""} domain-filter="sensor"
            @value-changed=${(e)=>{ e.target.dataset = { field: "ewEntityJ1" }; this._valueChanged(e); }}></ha-entity-picker>
          <ha-entity-picker .hass=${this.hass} label="J+2" .value=${c.ewEntityJ2 || ""} domain-filter="sensor"
            @value-changed=${(e)=>{ e.target.dataset = { field: "ewEntityJ2" }; this._valueChanged(e); }}></ha-entity-picker>
          <mwc-switch title="Afficher EcoWatt J+0" ?checked=${c.showEcoWatt === true} @change=${(e)=>{ e.target.dataset = { field: "showEcoWatt" }; this._valueChanged(e); }}></mwc-switch>
          <mwc-switch title="Afficher EcoWatt J+1/J+2" ?checked=${c.showEcoWattJ12 === true} @change=${(e)=>{ e.target.dataset = { field: "showEcoWattJ12" }; this._valueChanged(e); }}></mwc-switch>
        </div>

        <div class="row">
          <div class="title">Tempo (couleur du jour / lendemain)</div>
          <ha-entity-picker .hass=${this.hass} label="Sensor info" .value=${c.tempoEntityInfo || ""} domain-filter="sensor"
            @value-changed=${(e)=>{ e.target.dataset = { field: "tempoEntityInfo" }; this._valueChanged(e); }}></ha-entity-picker>
          <ha-entity-picker .hass=${this.hass} label="J0" .value=${c.tempoEntityJ0 || ""} domain-filter="sensor"
            @value-changed=${(e)=>{ e.target.dataset = { field: "tempoEntityJ0" }; this._valueChanged(e); }}></ha-entity-picker>
          <ha-entity-picker .hass=${this.hass} label="J1" .value=${c.tempoEntityJ1 || ""} domain-filter="sensor"
            @value-changed=${(e)=>{ e.target.dataset = { field: "tempoEntityJ1" }; this._valueChanged(e); }}></ha-entity-picker>
          <mwc-switch title="Afficher Tempo" ?checked=${c.showTempo === true} @change=${(e)=>{ e.target.dataset = { field: "showTempo" }; this._valueChanged(e); }}></mwc-switch>
          <mwc-switch title="Colorer l'historique par Tempo" ?checked=${c.showTempoColor === true} @change=${(e)=>{ e.target.dataset = { field: "showTempoColor" }; this._valueChanged(e); }}></mwc-switch>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config { padding: 16px; }
      .row { display: grid; grid-gap: 8px; margin-bottom: 12px; }
      .row.two { grid-template-columns: 1fr auto; align-items: center; }
      .title { font-weight: 600; margin-bottom: 6px; }
      ha-entity-picker, paper-input { width: 100%; }
    `;
  }
}

customElements.define("content-card-linky-tic-editor", ContentCardLinkyTicEditor);
