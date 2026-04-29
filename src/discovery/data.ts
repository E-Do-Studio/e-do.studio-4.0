import type { DiscoveryPost, DiscoveryCategory, SocialLink } from '../types';

export const DISCOVERY_POSTS: DiscoveryPost[] = [
  {id:1, cat:'tips', tone:'warm', tag:{fr:'Tips',en:'Tips'}, title:{fr:'Cinq lumières pour un still-life propre',en:'Five lights for a clean still-life'}, sub:{fr:'Comment poser une boîte et la rendre désirable. Tour des cinq sources qu’on règle dans cet ordre, en commençant par la boîte douce du dessus, et pourquoi la dernière passe se joue souvent au flag.',en:'How to set a box and make it desirable.'}, date:{fr:'14 mars',en:'Mar 14'}, read:'6 min', author:'Léo Marchal'},
  {id:2, cat:'tuto', tone:'mono', tag:{fr:'Tuto',en:'Tutorial'}, title:{fr:'Calibrer son cyclorama',en:'Calibrating your cyclorama'}, sub:{fr:'Para 222, charte 18%, balance des blancs.',en:'Para 222, 18% chart, white balance.'}, date:{fr:'28 fév.',en:'Feb 28'}, read:'4 min', author:'Inès Bertrand'},
  {id:3, cat:'studio', tone:'dark', tag:{fr:'Studio',en:'Studio'}, title:{fr:'Une nuit sur le plateau Live',en:'A night on the Live stage'}, sub:{fr:'Lookbook Moa FW26 — coulisses d’un tournage de nuit, six looks, deux régies, une équipe qui anticipe.',en:'Moa FW26 lookbook — behind the scenes.'}, date:{fr:'25 jan.',en:'Jan 25'}, read:'7 min', author:'Camille Royer'},
  {id:4, cat:'tips', tone:'warm', tag:{fr:'Tips',en:'Tips'}, title:{fr:'Tendre un fond papier sans pli',en:'Hang a seamless without creases'}, sub:{fr:'Le geste, l’humidité, la patience.',en:'The gesture, humidity, patience.'}, date:{fr:'18 jan.',en:'Jan 18'}, read:'5 min', author:'Léo Marchal'},
  {id:5, cat:'studio', tone:'mono', tag:{fr:'Studio',en:'Studio'}, title:{fr:'Le plateau Eclipse ouvre ses portes',en:'Eclipse stage is now open'}, sub:{fr:'120 m², lumière sud, plafond 5,40m.',en:'120 m², south light, 5.4m ceiling.'}, date:{fr:'3 fév.',en:'Feb 3'}, read:'2 min', author:'Studio'},
  {id:6, cat:'possible', tone:'warm', tag:{fr:'Possibilités',en:'What\'s possible'}, title:{fr:'Tourner photo + vidéo le même jour',en:'Shoot photo + video the same day'}, sub:{fr:'Une équipe, deux plateaux, un planning.',en:'One crew, two stages, one plan.'}, date:{fr:'7 mars',en:'Mar 7'}, read:'5 min', author:'Production'},
  {id:7, cat:'tips', tone:'mono', tag:{fr:'Tips',en:'Tips'}, title:{fr:'Bien briefer son styliste',en:'How to brief your stylist'}, sub:{fr:'Trois listes, un mood, dix minutes.',en:'Three lists, one mood, ten minutes.'}, date:{fr:'2 mars',en:'Mar 2'}, read:'3 min', author:'Inès Bertrand'},
  {id:8, cat:'possible', tone:'dark', tag:{fr:'Possibilités',en:'What\'s possible'}, title:{fr:'Live shopping depuis le plateau Live',en:'Live shopping from the Live stage'}, sub:{fr:'Multi-cam, régie son, public en salle.',en:'Multi-cam, sound mixing, audience.'}, date:{fr:'15 fév.',en:'Feb 15'}, read:'6 min', author:'Production'},
  {id:9, cat:'tuto', tone:'warm', tag:{fr:'Tuto',en:'Tutorial'}, title:{fr:'Étalonner sans LUT — la méthode rapide',en:'Grading without LUT — the quick method'}, sub:{fr:'Trois courbes, deux roues, un œil.',en:'Three curves, two wheels, one eye.'}, date:{fr:'10 fév.',en:'Feb 10'}, read:'8 min', author:'Léo Marchal'},
  {id:10, cat:'studio', tone:'warm', tag:{fr:'Studio',en:'Studio'}, title:{fr:'La cuisine du studio — chef Anne',en:'The studio kitchen — chef Anne'}, sub:{fr:'Manger bien sur un tournage, ça change tout.',en:'Eating well on a set changes everything.'}, date:{fr:'22 jan.',en:'Jan 22'}, read:'4 min', author:'Studio'},
  {id:11, cat:'tuto', tone:'mono', tag:{fr:'Tuto',en:'Tutorial'}, title:{fr:'Préparer son shoot en 30 minutes',en:'Prep your shoot in 30 minutes'}, sub:{fr:'Checklist du brief au call sheet.',en:'Brief to call sheet checklist.'}, date:{fr:'5 jan.',en:'Jan 5'}, read:'5 min', author:'Inès Bertrand'},
  {id:12, cat:'possible', tone:'mono', tag:{fr:'Possibilités',en:'What\'s possible'}, title:{fr:'Production crew clé en main',en:'Turnkey production crew'}, sub:{fr:'Photographe, styliste, MUA, retoucheur.',en:'Photographer, stylist, MUA, retoucher.'}, date:{fr:'12 déc.',en:'Dec 12'}, read:'4 min', author:'Production'},
];

export const DISCOVERY_CATEGORIES: DiscoveryCategory[] = [
  {k:'all', fr:'Tout', en:'All'},
  {k:'tips', fr:'Tips', en:'Tips'},
  {k:'tuto', fr:'Tutos', en:'Tutorials'},
  {k:'studio', fr:'Studio', en:'Studio'},
  {k:'possible', fr:'Possibilités', en:'Possibilities'},
];

export const DISCOVERY_SOCIAL_LINKS: SocialLink[] = [
  {k:'instagram', label:'IG', href:'https://www.instagram.com/edostudio/'},
  {k:'linkedin', label:'LI', href:'https://www.linkedin.com/company/e-do/'},
  {k:'facebook', label:'FB', href:'https://www.facebook.com/EdoStudioAgency/'},
  {k:'tiktok', label:'TT', href:'https://www.tiktok.com/@edostudio'},
];

export const DISCOVERY_FIXED_POST_IDS = [3, 1, 6, 9];
