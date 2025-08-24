# content-card-linky-tic
[![HACS Supported](https://img.shields.io/badge/HACS-Supported-green.svg)](https://github.com/custom-components/hacs)

**Cette carte est compatible qu'avec l'integration : [MyElectricalData](https://github.com/MyElectricalData/myelectricaldata_import)**

**Un question ? Un problème ? Une demande ? Venez en parler sur le [forum HACF](https://forum.hacf.fr/).**

## Bienvenue !

Avant de pouvoir utiliser cette intégration, assurez vous : 
* D'avoir validé l'installation correcte de [MyElectricalData](https://github.com/MyElectricalData/myelectricaldata_import)

## Installer la carte
<details>
  <summary><b>Via HACS (mise à jour en un clic) : </b></summary><br>
 
* Ouvrez HACS, cliquez sur `Frontend`, puis selectionnez le menu 3 points en haut à droite.
 
 *si vous n'avez pas HACS, pour l'installer cela se passe ici : [HACS : Ajoutez des modules et des cartes personnalisées](https://forum.hacf.fr/t/hacs-ajoutez-des-modules-et-des-cartes-personnalisees/359)
 
* Ajoutez le dépot personnalisé : `https://github.com/MyElectricalData/content-card-linky`

* Choisir la catégorie `Lovelace`

* Cliquez sur le bouton `Installer` de la carte
 
* Cliquez sur le bouton `Installer` de la popup
 
* La carte est maintenant rouge, signifiant qu'un redémarrage du serveur Home Assistant est nécessaire

* Accédez à la vue `Contrôle du serveur` (`Configuration` -> `Contrôle du serveur`), puis cliquez sur le bouton `Redémarrer` dans la zone `Gestion du serveur`
</details>

<details>
  <summary><b>Manuellement (à faire à chaque mise à jour)</b></summary>
* Telecharger le fichier [content-card-linky.js](https://github.com/MyElectricalData/content-card-linky/blob/main/content-card-linky.js) et le dossier [images](https://github.com/MyElectricalData/content-card-linky/tree/main/images) 
  
* Les mettre dans votre repertoire `www` et l'ajouter dans l'interface ressource
  
* Configurez la ressource dans votre fichier de configuration.
  
```
resources:
  - url: /hacsfiles/content-card-linky/content-card-linky.js
    type: module
```
</details>

## Ajouter la carte
<details>
  <summary><b>Via l'interface graphique</b></summary>
  * Ajoutez une carte via l'interface graphique, et configurez les options comme vous le désirez.  

</details>
<details>
  <summary><b>En YAML</b></summary>
  * Dans votre éditeur lovelace, ajouter ceci :

````
type: 'custom:content-card-linky'
entity: sensor.linky_<pdl>_consumption
````
</details>

### Redémarrer votre serveur Home Assistant

## Options disponibles

![image](https://github.com/user-attachments/assets/c00aafd2-c631-4021-82a0-583c8f31caf6)



  ````
type: custom:content-card-linky                 Type de la carte
nbJoursAffichage: '7'                           Nombre de jours historique affiché
titleName: LINKY                                Titre
entity: sensor.linky_123456789_consumption      Sensor de l'integration MyElectricalData
ewEntity: sensor.rte_ecowatt_j0                 Sensor de l'intégration Ecowatt J+0 via (!) MyElectricalData (sensor dispo dès MyElectricaldata v0.9.1)
ewEntityJ1: sensor.rte_ecowatt_j1               Sensor de l'intégration Ecowatt J+1 via (!) MyElectricalData (sensor dispo dès MyElectricaldata v0.9.1)
ewEntityJ2: sensor.rte_ecowatt_j2               Sensor de l'intégration Ecowatt J+2 via (!) MyElectricalData (sensor dispo dès MyElectricaldata v0.9.1)
tempoInfo: sensor.edf_tempo_info                Sensor de l'intégration Tempo, contient des prix et jours restant par couleur (dispo dès MyElectricalData v0.9.2 ou dev 0.9.2.b4)
tempoEntityJ0: sensor.rte_tempo_today           Sensor de l'intégration Tempo aujourd'hui
tempoEntityJ1: sensor.rte_tempo_tomorrow        Sensor de l'intégration Tempo demain
showIcon: false                                 Affiche l'icon Linky
showHistory: true                               Affiche l'historique sur plusieurs jours
showInTableUnit: false                          
showDayPriceHCHP: false
showDayHCHP: false                              
showMonthRatio: false                           
showTitle: true                                 
showPeakOffPeak: false
showDayPrice: true                              
showPrice: true                                 Affiche le prix de l'historique
showCurrentMonthRatio: true                     
showWeekRatio: true                             
showDayName: long                               Affichage des jours de la semaine : "short", "narrow", "long"
showDayMaxPower: true                           Affichage MaxPower avec indication si dépassé
showTitleLine: true                             Affichage des titres par ligne
showEcoWatt: true                               Affichage EcoWatt pour ajourd'hui
showEcoWattJ12: true                            Affichage EcoWatt pour demains et après (sensor dispo dès MyElectricaldata v0.9.1)
showTempo: false                                Affichage Tempo
showTempoColor: true                            Affichage couleurs Tempo historique pas colorer les titres des jours (apd MED 0.9.3)     
````

![image](https://github.com/MyElectricalData/content-card-linky/assets/44190435/04dac630-1d05-43f0-bb9e-cfed3ae5a943)![image](https://github.com/MyElectricalData/content-card-linky/assets/44190435/a99ee251-c464-4199-bb33-35499e412771)



## Merci ##

Cette carte est basé sur [@saniho](https://github.com/saniho/content-card-linky)

**************

N'hésitez pas à aller faire un tour sur ce forum ou vous trouverez pleins d'informations

https://forum.hacf.fr/t/hacs-ajoutez-des-modules-et-des-cartes-personnalisees/359 

*************
