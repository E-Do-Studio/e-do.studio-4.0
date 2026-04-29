/* global React, IconArrowRight, IconMenu, Wordmark, CellLabel, MarqueeCell */

const { useState: useStateLegal } = React;

/* ==========================================================
   LEGAL PAGE
   Mentions légales · CGV · CGU · Confidentialité · Cookies
   Left rail = navigation; main = long-form legal content.
   Typographic, understated, readable. No fluff.
   ========================================================== */

const SECTIONS = [
  { k:'mentions', fr:'Mentions légales',     en:'Legal notice',      updated:'12.2024' },
  { k:'cgv',      fr:'Conditions de vente',   en:'Terms of sale',     updated:'05.12.2024' },
  { k:'cgu',      fr:"Conditions d'utilisation", en:'Terms of use',   updated:'05.12.2024' },
  { k:'privacy',  fr:'Confidentialité',      en:'Privacy policy',    updated:'12.2024' },
  { k:'cookies',  fr:'Cookies',              en:'Cookies',           updated:'12.2024' },
];

/* ----- CONTENT ---------- */

const CONTENT = {
  mentions: {
    intro: {
      fr: "Informations légales relatives à l'édition et à l'exploitation du site www.e-do.studio.",
      en: "Legal information about the publication and operation of the www.e-do.studio website.",
    },
    blocks: [
      { t:{fr:'Éditeur du site',en:'Publisher'}, rows:[
        { k:{fr:'Raison sociale',en:'Company'}, v:'GRW' },
        { k:{fr:'Forme juridique',en:'Legal form'}, v:{fr:'Société par actions simplifiée',en:'Simplified joint-stock company'} },
        { k:{fr:'Capital social',en:'Share capital'}, v:'10 000 €' },
        { k:{fr:'RCS',en:'Trade register'}, v:'Bobigny · 891 710 857' },
        { k:{fr:'N° TVA intracommunautaire',en:'VAT number'}, v:'FR 41 891 710 857' },
        { k:{fr:'Président',en:'President'}, v:'Monsieur Thomas Guedj' },
        { k:{fr:'Siège social',en:'Registered office'}, v:'69, boulevard Victor Hugo · 93400 Saint-Ouen-sur-Seine' },
        { k:'E-mail', v:'contact@e-do.studio' },
      ]},
      { t:{fr:'Hébergement',en:'Hosting'}, rows:[
        { k:{fr:'Prestataire',en:'Provider'}, v:{fr:'SCALEWAY — société par actions simplifiée',en:'SCALEWAY — simplified joint-stock company'} },
        { k:{fr:'Capital social',en:'Share capital'}, v:'66 043 360,50 €' },
        { k:{fr:'Adresse',en:'Address'}, v:"8 rue de la Ville L'Évêque · 75008 Paris" },
        { k:'RCS', v:'Paris · 433 115 904' },
      ]},
      { t:{fr:'Propriété intellectuelle',en:'Intellectual property'}, p:{
        fr:"L'ensemble des contenus présents sur www.e-do.studio (textes, images, vidéos, logos, code, marque) demeure la propriété exclusive de la société GRW ou de ses partenaires contractuels. Toute reproduction, représentation, diffusion ou exploitation, totale ou partielle, sans accord écrit préalable est interdite et susceptible de poursuites.",
        en:"All content on www.e-do.studio (text, images, video, logos, code, trademarks) remains the exclusive property of GRW or its contractual partners. Any reproduction, representation, distribution or use, in whole or in part, without prior written consent is prohibited and may be subject to legal action.",
      }},
    ],
  },

  cgv: {
    intro:{
      fr:"Conditions générales de vente régissant les relations entre GRW (« E-DO ») et ses Clients pour l'ensemble des Services proposés. Version applicable à partir du 05/12/2024.",
      en:"General terms of sale governing the relationship between GRW (\"E-DO\") and its Clients for all Services offered. Version applicable from 05/12/2024.",
    },
    articles: [
      { n:'01', t:{fr:"Objet — Champ d'application — Acceptation",en:'Purpose — Scope — Acceptance'}, p:{
        fr:"Les présentes CGV définissent les conditions et modalités selon lesquelles E-DO propose à ses Clients et réalise les Services. Elles s'appliquent à l'ensemble des Services proposés par E-DO et doivent être acceptées par le Client préalablement à toute souscription. Toute modification prend effet immédiatement à compter de sa mise en ligne.",
        en:"These T&Cs define the terms under which E-DO offers and delivers Services to its Clients. They apply to all Services offered by E-DO and must be accepted by the Client prior to any subscription. Any modification takes effect immediately upon being published online.",
      }},
      { n:'02', t:{fr:'Services proposés',en:'Services offered'}, p:{
        fr:"E-DO propose les Services « E-Commerce » (Live, Horizontal, Vertical, Eclipse), le Service « Cyclorama » (studio photo de 4,70 m de hauteur et 10 m de profondeur sur fond blanc infini) et le Service « Post-Production ». La réalisation peut être effectuée directement par le Client ou par E-DO sans déplacement nécessaire sur Site.",
        en:"E-DO offers \"E-Commerce\" Services (Live, Horizontal, Vertical, Eclipse), the \"Cyclorama\" Service (photo studio 4.70 m high and 10 m deep on infinite white background) and the \"Post-Production\" Service. Services may be performed directly by the Client or by E-DO with no need to travel on Site.",
      }},
      { n:'03', t:{fr:'Souscription & Devis',en:'Subscription & Quote'}, p:{
        fr:"La souscription aux Services « E-Commerce » s'effectue via le Module de Réservation ou par acceptation d'un Devis. Les Services « Cyclo » et « Post-Production » nécessitent l'acceptation d'un Devis daté et signé. L'acceptation est ferme et définitive, et vaut acceptation des CGV.",
        en:"\"E-Commerce\" Services are booked via the Booking Module or by accepting a Quote. \"Cyclo\" and \"Post-Production\" Services require acceptance of a dated and signed Quote. Acceptance is firm and final, and constitutes acceptance of these T&Cs.",
      }},
      { n:'04', t:{fr:'Prix des Services',en:'Pricing'}, p:{
        fr:"Tous les Prix sont exprimés en euros HT. Live : 170 €/h, 590 € la demi-journée (4 h), 1 020 € la journée (8 h). Horizontal & Vertical : 110 €/h, 390 € la demi-journée, 650 € la journée. Eclipse : 150 €/h, 530 € la demi-journée, 890 € la journée. Toute heure entamée est due. Majoration de 25 % pour les week-ends et jours fériés. Le Service Live inclut 3 m de papier colorama (15 € HT le mètre supplémentaire).",
        en:"All prices are in euros excluding VAT. Live: €170/h, €590 half-day (4 h), €1,020 day (8 h). Horizontal & Vertical: €110/h, €390 half-day, €650 day. Eclipse: €150/h, €530 half-day, €890 day. Any started hour is owed in full. 25% surcharge for weekends and public holidays. The Live Service includes 3 m of colorama paper (€15 excl. VAT per additional metre).",
      }},
      { n:'05', t:{fr:'Modalités de paiement',en:'Payment terms'}, p:{
        fr:"Le règlement s'effectue par prélèvement, virement bancaire ou via la plateforme du Prestataire de Paiement (STRIPE). Le délai de paiement est de quinze (15) jours à compter de l'émission de la facture. Tout retard entraîne des pénalités au taux directeur semestriel de la BCE majoré de 10 points, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement.",
        en:"Payment is made by direct debit, bank transfer or via the Payment Provider's platform (STRIPE). Payment is due within fifteen (15) days of invoice issuance. Late payment incurs penalties at the semi-annual ECB key rate plus 10 points, plus a flat €40 recovery fee.",
      }},
      { n:'06', t:{fr:'Rendez-vous & Annulation',en:'Appointments & Cancellation'}, p:{
        fr:"L'Utilisateur qui a confirmé son rendez-vous s'engage à l'honorer. En cas de rendez-vous confirmé et non honoré, E-DO se réserve le droit de facturer le Service au Client selon les modalités choisies lors de la Réservation. Le non-règlement de la facture entraîne l'impossibilité de télécharger les Images et la suspension du Compte Personnel.",
        en:"A Client who confirms an appointment commits to honouring it. If a confirmed appointment is not honoured, E-DO reserves the right to invoice the Service per the booking terms. Non-payment prevents Image downloads and triggers suspension of the Personal Account.",
      }},
      { n:'07', t:{fr:'Responsabilités & Garanties',en:'Liability & Warranties'}, p:{
        fr:"E-DO s'engage à réaliser les Services avec diligence et professionnalisme, étant tenue d'une obligation de moyens. Les délais de livraison des Images sont indicatifs. Toute dégradation du matériel mis à disposition par E-DO entraînera la facturation du coût de réparation ou de remplacement. Dans le cadre du Service « Post-Production », le Client bénéficie de deux allers-retours de commentaires dans un délai de quinze jours.",
        en:"E-DO undertakes to perform the Services diligently and professionally, with a best-efforts obligation. Image delivery times are indicative. Any damage to equipment made available by E-DO will be invoiced at repair or replacement cost. Under the \"Post-Production\" Service, the Client is entitled to two rounds of feedback within fifteen days.",
      }},
      { n:'08', t:{fr:'Résiliation',en:'Termination'}, p:{
        fr:"En cas de manquement par l'une des Parties, auquel il n'aura pas été remédié dans un délai de huit (8) jours à compter de la notification, la Partie affectée pourra résilier la souscription aux Services ou solliciter le remboursement du Prix payé, sous réserve que le manquement soit prouvé.",
        en:"In the event of a breach by either Party, not remedied within eight (8) days of notification, the affected Party may terminate the subscription to Services or request reimbursement of the Price paid, subject to proof of the breach.",
      }},
      { n:'09', t:{fr:'Propriété intellectuelle',en:'Intellectual property'}, p:{
        fr:"E-DO cède à titre exclusif, définitif et irrévocable l'intégralité des Droits de Propriété Intellectuelle afférents aux Images dont le Prix a été réglé, pour toute la durée des droits et pour le monde entier. Par exception, en cas d'Images réalisées suivant une direction artistique conduite par E-DO, seul un contrat de licence sera conclu.",
        en:"E-DO assigns exclusively, definitively and irrevocably all Intellectual Property Rights to Images for which Payment has been received, for the entire duration of the rights and worldwide. As an exception, where Images follow an artistic direction led by E-DO, only a licence agreement will be concluded.",
      }},
      { n:'10', t:{fr:'Confidentialité',en:'Confidentiality'}, p:{
        fr:"E-DO s'engage à conserver le caractère confidentiel des Informations Confidentielles transmises par le Client et à ne pas les communiquer à des tiers, sauf accord préalable du Client ou obligation légale.",
        en:"E-DO undertakes to maintain the confidentiality of Confidential Information shared by the Client and not to disclose it to third parties without prior consent or legal obligation.",
      }},
      { n:'11', t:{fr:'Force majeure',en:'Force majeure'}, p:{
        fr:"Les Parties ne sont pas tenues responsables d'un manquement résultant d'un cas de force majeure défini par l'article 1218 du Code civil. La Partie affectée doit en informer l'autre par écrit dans les 48 heures. Au-delà de 30 jours de suspension, chaque Partie peut résilier de plein droit les CGV.",
        en:"The Parties are not liable for breaches arising from force majeure as defined in article 1218 of the French Civil Code. The affected Party must notify the other in writing within 48 hours. Beyond 30 days of suspension, either Party may terminate by right.",
      }},
      { n:'12', t:{fr:'Droit applicable & litiges',en:'Governing law & disputes'}, p:{
        fr:"Les présentes CGV sont soumises au droit français. Toute réclamation est à adresser par courriel à app@e-do.studio. À défaut d'accord amiable dans les 30 jours, tout litige relèvera de la compétence exclusive du Tribunal de commerce de Paris.",
        en:"These T&Cs are governed by French law. Any complaint should be sent to app@e-do.studio. Failing amicable settlement within 30 days, any dispute falls under the exclusive jurisdiction of the Commercial Court of Paris.",
      }},
    ],
  },

  cgu: {
    intro:{
      fr:"Conditions générales d'utilisation du site www.e-do.studio régissant les relations entre GRW et les Utilisateurs. Version applicable à partir du 05/12/2024.",
      en:"General terms of use for www.e-do.studio governing the relationship between GRW and Users. Version applicable from 05/12/2024.",
    },
    articles: [
      { n:'01', t:{fr:'Objet du Site Web',en:'Purpose of the Website'}, p:{
        fr:"Le Site Web présente aux Utilisateurs les Services proposés par E-DO, met à disposition le Module de Réservation et l'Application E-DO, et permet de contacter E-DO pour faire part d'un Projet, d'une demande de rendez-vous ou de devis.",
        en:"The Website presents the Services offered by E-DO, provides access to the Booking Module and the E-DO Application, and allows users to contact E-DO with a Project, an appointment request or a quote request.",
      }},
      { n:'02', t:{fr:'Module de Réservation',en:'Booking Module'}, p:{
        fr:"Le Module de Réservation, accessible via l'onglet « Réserve une séance », permet de réserver des créneaux pour les Services E-Commerce. L'Utilisateur choisit la catégorie de Service et la durée (minimum 1 heure), puis la date et l'heure, renseigne ses coordonnées et celles de la société, répond aux questions précises, accepte les CGV et confirme le rendez-vous.",
        en:"The Booking Module, accessible via the \"Book a session\" tab, lets users reserve slots for E-Commerce Services. The User selects the Service category and duration (minimum 1 hour), then date and time, enters personal and company details, answers the questions, accepts the T&Cs and confirms the appointment.",
      }},
      { n:'03', t:{fr:'Réservation du Service Cyclo',en:'Cyclo Service booking'}, p:{
        fr:"L'Utilisateur peut effectuer une demande de réservation du Service « CYCLO » en cliquant sur l'icône « Réserver » depuis l'onglet « Cyclo », ou en remplissant le formulaire depuis l'onglet « Contact », et en acceptant les CGV. La souscription définitive est effectuée selon les modalités prévues aux CGV.",
        en:"Users may request booking of the \"CYCLO\" Service by clicking \"Book\" from the \"Cyclo\" tab or by filling in the form from the \"Contact\" tab, and accepting the T&Cs. Final subscription follows the terms set out in the T&Cs.",
      }},
      { n:'04', t:{fr:"Application E-DO — Comptes",en:'E-DO Application — Accounts'}, p:{
        fr:"L'Application E-DO est l'interface privilégiée entre les Utilisateurs et E-DO. Le Compte Administrateur de Marque est accessible via identifiant et mot de passe communiqués par E-DO ; il doit être configuré avec les coordonnées de la société, l'adresse de facturation, le SIREN et les coordonnées bancaires. E-DO exclut toute responsabilité liée au choix ou à l'usage de l'identifiant et du mot de passe.",
        en:"The E-DO Application is the primary interface between Users and E-DO. The Brand Administrator Account is accessible with credentials provided by E-DO and must be configured with company details, billing address, SIREN number and bank details. E-DO disclaims any liability related to credential choice or use.",
      }},
      { n:'05', t:{fr:'Mise à disposition des Images',en:'Image delivery'}, p:{
        fr:"Les Images, retouchées le cas échéant, sont mises à disposition du Client via l'Application E-DO. Le Client peut effectuer deux allers-retours de commentaires dans un délai de quinze jours dans le cadre du Service Post-Production. Le téléchargement est conditionné au règlement complet du Prix.",
        en:"Images, retouched where applicable, are delivered through the E-DO Application. The Client may submit two rounds of feedback within fifteen days under the Post-Production Service. Downloading is subject to full payment of the Price.",
      }},
      { n:'06', t:{fr:'Obligations des Utilisateurs',en:'User obligations'}, p:{
        fr:"Toutes les informations renseignées par l'Utilisateur doivent être exactes. L'Utilisateur s'engage à utiliser le Site Web et l'Application conformément à leur destination, à respecter les droits des tiers, et à ne pas porter atteinte au fonctionnement du Site.",
        en:"All information provided by the User must be accurate. Users undertake to use the Website and Application in accordance with their purpose, to respect third-party rights, and not to interfere with the operation of the Site.",
      }},
      { n:'07', t:{fr:'Disponibilité du Site',en:'Site availability'}, p:{
        fr:"E-DO s'efforce d'assurer la disponibilité du Site Web 24h/24 et 7j/7. E-DO se réserve néanmoins le droit, sans préavis ni indemnité, de suspendre temporairement l'accès pour maintenance, mise à jour, ou en cas de cas de force majeure.",
        en:"E-DO strives to keep the Website available 24/7. E-DO reserves the right, without notice or compensation, to temporarily suspend access for maintenance, updates, or in cases of force majeure.",
      }},
      { n:'08', t:{fr:'Droit applicable',en:'Governing law'}, p:{
        fr:"Les présentes CGU sont soumises au droit français. Tout litige qui n'aurait pas trouvé de solution amiable relèvera de la compétence du Tribunal de commerce de Paris.",
        en:"These Terms of Use are governed by French law. Any dispute not resolved amicably falls under the jurisdiction of the Commercial Court of Paris.",
      }},
    ],
  },

  privacy: {
    intro:{
      fr:"En application du RGPD et de la loi Informatique et Libertés, GRW (ci-après « GRW ») a adopté la présente politique relative à la confidentialité et à la protection des données personnelles des Utilisateurs du site https://www.e-do.studio.",
      en:"In accordance with the GDPR and the French Data Protection Act, GRW (hereinafter \"GRW\") has adopted this policy on the confidentiality and protection of personal data of Users of https://www.e-do.studio.",
    },
    articles:[
      { n:'01', t:{fr:'Responsable du traitement',en:'Data controller'}, p:{
        fr:"GRW, société par actions simplifiée au capital de 10 000 €, siège au 69 boulevard Victor Hugo, 93400 Saint-Ouen-sur-Seine, RCS Bobigny 891 710 857, est le responsable du traitement des données personnelles collectées et traitées afin de mettre en œuvre les Services. Contact : contact@e-do.studio.",
        en:"GRW, simplified joint-stock company with capital of €10,000, registered office at 69 boulevard Victor Hugo, 93400 Saint-Ouen-sur-Seine, RCS Bobigny 891 710 857, is the controller of personal data collected and processed to deliver the Services. Contact: contact@e-do.studio.",
      }},
      { n:'02', t:{fr:'Données collectées',en:'Data collected'}, p:{
        fr:"Onglet Contact : nom, prénom, numéro de téléphone, adresse électronique, message écrit. Compte personnel : noms, prénoms, adresse de facturation, fonction/rôle, coordonnées bancaires, message écrit. Sont également collectées les informations transmises lors d'une inscription à la newsletter, les informations issues des cookies acceptés par l'internaute, et les mesures d'audience avec adresses IP masquées (anonymisées).",
        en:"Contact tab: surname, first name, phone number, e-mail address, written message. Personal account: surnames, first names, billing address, role, bank details, written message. Also collected: information submitted via newsletter sign-up, information from cookies accepted by the user, and audience metrics with masked (anonymised) IP addresses.",
      }},
      { n:'03', t:{fr:'Localisation des données',en:'Data location'}, p:{
        fr:"Les données personnelles collectées sur notre site internet sont hébergées en France. GRW fait ses meilleurs efforts pour maintenir les données exactes et complètes ; vous pouvez nous communiquer toute mise à jour de vos coordonnées.",
        en:"Personal data collected on our website is hosted in France. GRW makes its best efforts to keep the data accurate and complete; you may notify us of any update to your details.",
      }},
      { n:'04', t:{fr:'Finalités & bases légales',en:'Purposes & legal bases'}, p:{
        fr:"Exécution du contrat : mise en œuvre des Services, communication avec vous, traitement des paiements, gestion des Devis et de l'acceptation de la présente Politique. Intérêt légitime : analyses statistiques et marketing, enquêtes de satisfaction, amélioration du site, prévention des abus et de la fraude, respect des obligations légales. Consentement : prospection commerciale pour services non analogues.",
        en:"Contract performance: Service delivery, communicating with you, processing payments, Quote management and acceptance of this Policy. Legitimate interest: statistical and marketing analysis, satisfaction surveys, site improvement, abuse and fraud prevention, legal compliance. Consent: marketing for non-similar services.",
      }},
      { n:'05', t:{fr:'Cookies',en:'Cookies'}, p:{
        fr:"GRW ne collecte pas de cookies sans consentement préalable, à l'exception de ceux exemptés par la CNIL (authentification, choix de cookies, personnalisation de l'interface, équilibrage de charge, mesure d'audience). À ce jour, vous pouvez accepter ou refuser les cookies via le bandeau affiché lors de votre navigation. Les cookies sont conservés pour une durée maximale de 13 mois.",
        en:"GRW does not place cookies without prior consent, except for those exempted by the CNIL (authentication, cookie choice, interface personalisation, load balancing, audience measurement). You may accept or refuse cookies via the banner displayed while browsing. Cookies are retained for a maximum of 13 months.",
      }},
      { n:'06', t:{fr:'Destinataires des données',en:'Data recipients'}, p:{
        fr:"Les données personnelles peuvent être transmises : aux personnes habilitées de GRW ; à Monsieur Guillaume Coutant (entrepreneur individuel SIRET 89262837100015) en charge du référencement SEO du site ; aux autorités administratives et judiciaires en cas d'obligation légale ; en tant que de besoin, à nos conseils juridiques et avocats.",
        en:"Personal data may be shared with: authorised GRW staff; Mr Guillaume Coutant (sole trader SIRET 89262837100015) in charge of SEO; administrative and judicial authorities where legally required; and, as needed, our legal counsel.",
      }},
      { n:'07', t:{fr:'Sécurité',en:'Security'}, p:{
        fr:"GRW met en œuvre des mesures organisationnelles, techniques, logicielles et physiques pour protéger les données personnelles contre toute perte, accès non autorisé, divulgation ou altération. Vous restez responsable du maintien de la confidentialité de vos identifiants et mots de passe.",
        en:"GRW implements organisational, technical, software and physical measures to protect personal data against loss, unauthorised access, disclosure or alteration. You remain responsible for keeping your credentials confidential.",
      }},
      { n:'08', t:{fr:'Conservation des données',en:'Data retention'}, p:{
        fr:"Les données nécessaires à la réalisation des Services sont conservées pendant la durée de la prestation et les cinq années suivantes, à des fins de preuve. Lorsque les données sont utilisées à des fins de marketing, la conservation peut aller jusqu'à trois ans suivant la date du dernier contact.",
        en:"Data needed to perform the Services is retained for the duration of the service plus the following five years, for evidentiary purposes. When data is used for marketing, it may be retained for up to three years after the last contact.",
      }},
      { n:'09', t:{fr:'Vos droits',en:'Your rights'}, p:{
        fr:"Vous disposez d'un droit d'accès, de rectification, de retrait, d'effacement, de portabilité, de limitation et d'opposition, ainsi que du droit d'organiser le sort de vos données après votre décès. Pour les exercer, contactez contact@e-do.studio. Vous pouvez également introduire une réclamation auprès de la CNIL — 3 Place de Fontenoy, 75007 Paris — www.cnil.fr.",
        en:"You have rights of access, rectification, withdrawal, erasure, portability, restriction and objection, plus the right to give post-mortem instructions on your data. To exercise: contact@e-do.studio. You may also file a complaint with the CNIL — 3 Place de Fontenoy, 75007 Paris — www.cnil.fr.",
      }},
    ],
  },

  cookies: {
    intro:{
      fr:"GRW collecte des cookies — fichiers texte stockés par votre navigateur — et n'en dépose pas sans consentement préalable, à l'exception de ceux exemptés par la CNIL. Conservation : 13 mois maximum par cookie.",
      en:"GRW uses cookies — text files stored by your browser — and does not place any without prior consent, except those exempted by the CNIL. Retention: maximum 13 months per cookie.",
    },
    table:[
      { n:'edo_session',   cat:'essential',  fr:'Session utilisateur',           en:'User session',           dur:{fr:'Session',en:'Session'},   who:'GRW' },
      { n:'edo_consent',   cat:'essential',  fr:'Mémorisation du choix de cookies',en:'Cookie choice memo',  dur:{fr:'13 mois',en:'13 months'},   who:'GRW' },
      { n:'edo_lang',      cat:'essential',  fr:'Préférence de langue',          en:'Language preference',  dur:{fr:'13 mois',en:'13 months'},       who:'GRW' },
      { n:'edo_auth',      cat:'essential',  fr:"Authentification compte",        en:'Account authentication',dur:{fr:'Session',en:'Session'},     who:'GRW' },
      { n:'_audience',     cat:'measure',    fr:"Mesure d'audience (IP anonymisée)",en:'Audience measurement (anonymised IP)',dur:{fr:'13 mois',en:'13 months'},who:'GRW' },
    ],
  },
};

/* ----- RENDER HELPERS ---------- */

const Row = ({ k, v, lang }) => (
  <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:20,padding:'10px 0',borderBottom:'1px solid var(--edo-gray-200)',fontSize:13,alignItems:'baseline'}}>
    <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',color:'#888'}}>
      {typeof k==='string'?k:k[lang]}
    </span>
    <span style={{color:'#141414',letterSpacing:'-0.005em'}}>
      {typeof v==='string'?v:v[lang]}
    </span>
  </div>
);

const Block = ({ t, rows, p, lang }) => (
  <section style={{padding:'26px 0',borderBottom:'1px solid var(--edo-gray-200)'}}>
    <h3 style={{margin:'0 0 14px',fontSize:20,fontWeight:500,letterSpacing:'-0.015em',color:'#141414'}}>{t[lang]}</h3>
    {rows && <div>{rows.map((r,i)=><Row key={i} {...r} lang={lang}/>)}</div>}
    {p && <p style={{margin:0,fontSize:14,lineHeight:1.65,color:'#3a3a3a',maxWidth:720}}>{p[lang]}</p>}
  </section>
);

const Article = ({ n, t, p, lang }) => (
  <article style={{display:'grid',gridTemplateColumns:'70px 1fr',gap:20,padding:'20px 0',borderBottom:'1px solid var(--edo-gray-200)'}}>
    <span style={{fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.18em',color:'var(--edo-orange)',paddingTop:4}}>Art. {n}</span>
    <div>
      <h4 style={{margin:'0 0 8px',fontSize:17,fontWeight:500,letterSpacing:'-0.01em',color:'#141414'}}>{t[lang]}</h4>
      <p style={{margin:0,fontSize:14,lineHeight:1.65,color:'#3a3a3a',maxWidth:720}}>{p[lang]}</p>
    </div>
  </article>
);

const LegalPage = ({ lang, setLang, openMenu, goto }) => {
  const [sec, setSec] = useStateLegal('mentions');
  const active = SECTIONS.find(s=>s.k===sec);
  const C = CONTENT[sec];

  return (
    <div style={{display:'grid',gridTemplateColumns:'190px 1fr',gridTemplateRows:'54px 1fr',gap:1,background:'#000',height:'100%',width:'100%'}}>

      {/* ========== HEADER — LEFT (logo only) ========== */}
      <div style={{gridColumn:'1',gridRow:'1',background:'#000',display:'flex',gap:1,minWidth:0}}>
        <button onClick={()=>goto('home')} style={{flex:'0 0 190px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:8}}>
          <Wordmark size={32}/>
        </button>
      </div>

      {/* ========== HEADER — RIGHT (title + contact + lang cells) ========== */}
      <div style={{gridColumn:'2',gridRow:'1',background:'#000',display:'flex',gap:1,minWidth:0}}>
        <div style={{flex:'1 1 auto',background:'#fff',padding:'0 24px',display:'flex',alignItems:'center',minWidth:0}}>
          <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>{lang==='fr'?'Légal':'Legal'}</span>
        </div>
        <button onClick={()=>goto('contact')} style={{flex:'0 0 auto',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 24px',gap:10}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.05em',textTransform:'uppercase',whiteSpace:'nowrap',color:'#141414'}}>{lang==='fr'?'Nous contacter':'Contact us'}</span>
          <IconArrowRight width="14" height="14"/>
        </button>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{flex:'0 0 54px',background:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
          <span style={{color:'#141414',fontFamily:'var(--font-mono)',fontSize:12,letterSpacing:'0.15em'}}>{lang==='fr'?'EN':'FR'}</span>
        </button>
      </div>

      {/* Left rail — sections */}
      <div style={{gridColumn:'1',gridRow:'2',background:'#fff',overflow:'auto',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px 16px 10px'}}>
          <span className="edo-cell-label">{lang==='fr'?'Sommaire':'Contents'}</span>
        </div>
        {SECTIONS.map((s,i)=>{
          const isActive = sec===s.k;
          return (
            <button key={s.k} onClick={()=>setSec(s.k)} style={{
              padding:'14px 16px',border:0,background:isActive?'var(--edo-gray-100)':'transparent',
              borderLeft:isActive?'2px solid var(--edo-orange)':'2px solid transparent',
              cursor:'pointer',textAlign:'left',display:'flex',flexDirection:'column',gap:4,
              fontFamily:'inherit',transition:'all .15s',
            }}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.2em',color:'#888'}}>0{i+1}</span>
              <span style={{fontSize:14,fontWeight:isActive?500:400,color:isActive?'#141414':'#595959',letterSpacing:'-0.005em'}}>
                {s[lang]}
              </span>
            </button>
          );
        })}

        <div style={{padding:'22px 16px',borderTop:'1px solid var(--edo-gray-200)',marginTop:12}}>
          <span className="edo-cell-label" style={{marginBottom:10,display:'block'}}>{lang==='fr'?'Une question ?':'Got a question?'}</span>
          <p style={{fontSize:12,color:'#595959',lineHeight:1.5,margin:'0 0 12px'}}>
            {lang==='fr'?'Écrivez-nous directement.':'Write to us directly.'}
          </p>
          <a href="mailto:contact@e-do.studio" style={{
            display:'inline-flex',alignItems:'center',gap:8,fontSize:12,color:'#141414',textDecoration:'none',
            borderBottom:'1px solid #141414',paddingBottom:2,
          }}>contact@e-do.studio <IconArrowRight width="10" height="10"/></a>
        </div>
        <div style={{flex:1}}/>
      </div>

      {/* Main */}
      <div style={{gridColumn:'2',gridRow:'2',background:'#fafafa',overflow:'auto'}}>

        {/* Header band */}
        <div style={{background:'#fff',padding:'36px 40px 28px',borderBottom:'1px solid var(--edo-gray-200)',display:'grid',gridTemplateColumns:'1fr auto',gap:24,alignItems:'end'}}>
          <div>
            <span className="edo-cell-label" style={{color:'var(--edo-orange)'}}>
              {String(SECTIONS.findIndex(s=>s.k===sec)+1).padStart(2,'0')} · {lang==='fr'?'Légal':'Legal'}
            </span>
            <h1 style={{margin:'10px 0 12px',fontSize:46,fontWeight:300,letterSpacing:'-0.03em',lineHeight:1,color:'#141414'}}>
              {active[lang]}<span style={{color:'var(--edo-orange)'}}>.</span>
            </h1>
            <p style={{margin:0,fontSize:14,color:'#595959',lineHeight:1.6,maxWidth:640}}>{C.intro[lang]}</p>
          </div>
          <div style={{textAlign:'right',display:'flex',flexDirection:'column',gap:4}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#888'}}>
              {lang==='fr'?'Dernière mise à jour':'Last updated'}
            </span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:14,letterSpacing:'0.05em',color:'#141414'}}>{active.updated}</span>
          </div>
        </div>

        {/* Body — per section */}
        <div style={{padding:'8px 40px 40px',maxWidth:980}}>

          {sec==='mentions' && C.blocks.map((b,i)=><Block key={i} {...b} lang={lang}/>)}

          {(sec==='cgv' || sec==='cgu' || sec==='privacy') && (
            <>
              <div style={{padding:'18px 0 8px',borderBottom:'1px solid var(--edo-gray-200)',display:'flex',justifyContent:'space-between',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#888'}}>
                <span>{C.articles.length} {lang==='fr'?'articles':'articles'}</span>
                <span>{lang==='fr'?'Version ':'Version '}{active.updated}</span>
              </div>
              {C.articles.map(a=><Article key={a.n} {...a} lang={lang}/>)}
            </>
          )}

          {sec==='cookies' && (
            <div style={{paddingTop:20}}>
              <div style={{display:'grid',gridTemplateColumns:'180px 110px 1fr 130px 110px',gap:16,padding:'12px 0',borderBottom:'1px solid #141414',fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#141414'}}>
                <span>{lang==='fr'?'Nom':'Name'}</span>
                <span>{lang==='fr'?'Catégorie':'Category'}</span>
                <span>{lang==='fr'?'Finalité':'Purpose'}</span>
                <span>{lang==='fr'?'Durée':'Duration'}</span>
                <span>{lang==='fr'?'Émis par':'Issued by'}</span>
              </div>
              {C.table.map((r,i)=>(
                <div key={r.n} style={{display:'grid',gridTemplateColumns:'180px 110px 1fr 130px 110px',gap:16,padding:'14px 0',borderBottom:'1px solid var(--edo-gray-200)',fontSize:13,alignItems:'center'}}>
                  <span style={{fontFamily:'var(--font-mono)',letterSpacing:'0.03em',color:'#141414'}}>{r.n}</span>
                  <span>
                    <span style={{
                      display:'inline-block',fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',
                      padding:'3px 8px',
                      background:r.cat==='essential'?'#141414':'var(--edo-orange)',
                      color:'#fff',
                    }}>{r.cat==='essential'?(lang==='fr'?'Essentiel':'Essential'):(lang==='fr'?'Mesure':'Measure')}</span>
                  </span>
                  <span style={{color:'#3a3a3a'}}>{lang==='fr'?r.fr:r.en}</span>
                  <span style={{fontFamily:'var(--font-mono)',color:'#595959'}}>{r.dur[lang]}</span>
                  <span style={{color:'#595959'}}>{r.who}</span>
                </div>
              ))}
              <p style={{marginTop:28,fontSize:13,color:'#595959',lineHeight:1.65,maxWidth:720}}>
                {lang==='fr'
                  ? "Vous pouvez « accepter » ou « refuser » les cookies via le bandeau qui s'affiche lors de votre navigation. À défaut d'action, la poursuite de la navigation vaut acceptation. Vous pouvez à tout moment modifier votre choix en effaçant les cookies depuis les préférences de votre navigateur, ou en nous écrivant à contact@e-do.studio."
                  : "You may \"accept\" or \"refuse\" cookies via the banner displayed during your browsing. Continuing to browse without action is considered acceptance. You may modify your choice at any time by clearing cookies in your browser preferences or writing to contact@e-do.studio."}
              </p>

              <div style={{marginTop:36,background:'#141414',color:'#fff',padding:'28px 32px',display:'grid',gridTemplateColumns:'1fr auto',gap:24,alignItems:'center'}}>
                <div>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--edo-orange)'}}>©  GRW · E-Do Studio</span>
                  <p style={{margin:'6px 0 0',fontSize:14,lineHeight:1.55,opacity:0.75,maxWidth:560}}>
                    {lang==='fr'
                      ? "RCS Bobigny 891 710 857 · 69 boulevard Victor Hugo · 93400 Saint-Ouen-sur-Seine. Tous droits réservés."
                      : "RCS Bobigny 891 710 857 · 69 boulevard Victor Hugo · 93400 Saint-Ouen-sur-Seine. All rights reserved."}
                  </p>
                </div>
                <button onClick={()=>goto('home')} style={{
                  background:'var(--edo-orange)',color:'#fff',border:0,height:52,padding:'0 24px',
                  fontFamily:'var(--font-mono)',fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',cursor:'pointer',
                  display:'inline-flex',alignItems:'center',gap:12,
                }}>{lang==='fr'?'Retour accueil':'Back to home'} <IconArrowRight width="14" height="14" stroke="#fff"/></button>
              </div>
            </div>
          )}

          {/* Global footer controls */}
          <div style={{marginTop:30,display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#888'}}>
            <span>{lang==='fr'?'Document consultable · Imprimable · Archivable':'Viewable · Printable · Archivable'}</span>
            <div style={{display:'flex',gap:20}}>
              <button onClick={()=>window.print()} style={{background:'transparent',border:0,cursor:'pointer',font:'inherit',letterSpacing:'inherit',textTransform:'inherit',color:'#141414'}}>
                ↓ {lang==='fr'?'Imprimer':'Print'}
              </button>
              <a href="mailto:contact@e-do.studio" style={{color:'#141414',textDecoration:'none'}}>
                contact@e-do.studio
              </a>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

Object.assign(window, { LegalPage });
