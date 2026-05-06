import type { Schema, Struct } from "@strapi/strapi";

export interface CellChat extends Struct.ComponentSchema {
  collectionName: "components_cell_chats";
  info: {
    displayName: "Cell Chat";
    icon: "message";
  };
  attributes: {
    defaultResponse_en: Schema.Attribute.Text;
    defaultResponse_fr: Schema.Attribute.Text;
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    label_en: Schema.Attribute.String;
    label_fr: Schema.Attribute.String;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    placeholder_en: Schema.Attribute.String;
    placeholder_fr: Schema.Attribute.String;
    responses: Schema.Attribute.JSON;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
    systemPrompt_en: Schema.Attribute.Text;
    systemPrompt_fr: Schema.Attribute.Text;
    welcomeMessage_en: Schema.Attribute.Text;
    welcomeMessage_fr: Schema.Attribute.Text;
  };
}

export interface CellContact extends Struct.ComponentSchema {
  collectionName: "components_cell_contacts";
  info: {
    displayName: "Cell Contact";
    icon: "phone";
  };
  attributes: {
    address: Schema.Attribute.String;
    addressLink: Schema.Attribute.String;
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    email: Schema.Attribute.String;
    label: Schema.Attribute.String;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    phone: Schema.Attribute.String;
    phoneDisplay: Schema.Attribute.String;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
  };
}

export interface CellCta extends Struct.ComponentSchema {
  collectionName: "components_cell_ctas";
  info: {
    displayName: "Cell CTA";
    icon: "cursor";
  };
  attributes: {
    action: Schema.Attribute.Enumeration<["link", "book", "quote"]>;
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    external: Schema.Attribute.Boolean;
    href: Schema.Attribute.String;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    service: Schema.Attribute.Enumeration<["cyclorama", "post-production"]>;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
    text_en: Schema.Attribute.String;
    text_fr: Schema.Attribute.String & Schema.Attribute.Required;
    variant: Schema.Attribute.Enumeration<["primary", "secondary"]>;
  };
}

export interface CellDetails extends Struct.ComponentSchema {
  collectionName: "components_cell_details";
  info: {
    displayName: "Cell Details";
    icon: "information";
  };
  attributes: {
    buttonText_en: Schema.Attribute.String;
    buttonText_fr: Schema.Attribute.String;
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    dialogContent: Schema.Attribute.JSON;
    dialogTitle_en: Schema.Attribute.String;
    dialogTitle_fr: Schema.Attribute.String;
    label_en: Schema.Attribute.String;
    label_fr: Schema.Attribute.String;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
  };
}

export interface CellGallery extends Struct.ComponentSchema {
  collectionName: "components_cell_galleries";
  info: {
    displayName: "Cell Gallery";
    icon: "picture";
  };
  attributes: {
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    images: Schema.Attribute.Media<undefined, true>;
    label_en: Schema.Attribute.String;
    label_fr: Schema.Attribute.String;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
  };
}

export interface CellImage extends Struct.ComponentSchema {
  collectionName: "components_cell_images";
  info: {
    displayName: "Cell Image";
    icon: "picture";
  };
  attributes: {
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    href: Schema.Attribute.String;
    images: Schema.Attribute.Media<undefined, true>;
    label_en: Schema.Attribute.String;
    label_fr: Schema.Attribute.String;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
    slideshow: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    slideshowInterval: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<10000>;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
  };
}

export interface CellMachine extends Struct.ComponentSchema {
  collectionName: "components_cell_machines";
  info: {
    displayName: "Cell Machine";
    icon: "cog";
  };
  attributes: {
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    machine: Schema.Attribute.Relation<"oneToOne", "api::machine.machine"> &
      Schema.Attribute.Required;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
  };
}

export interface CellMachineList extends Struct.ComponentSchema {
  collectionName: "components_cell_machine_lists";
  info: {
    displayName: "Cell Machine List";
    icon: "bulletList";
  };
  attributes: {
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    machines: Schema.Attribute.Relation<"oneToMany", "api::machine.machine">;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
  };
}

export interface CellModel3D extends Struct.ComponentSchema {
  collectionName: "components_cell_model3ds";
  info: {
    displayName: "Cell 3D Model";
    icon: "cube";
  };
  attributes: {
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    href: Schema.Attribute.String;
    label_en: Schema.Attribute.String;
    label_fr: Schema.Attribute.String & Schema.Attribute.Required;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    modelPath: Schema.Attribute.String & Schema.Attribute.Required;
    modelScale: Schema.Attribute.Float & Schema.Attribute.DefaultTo<0.22>;
    rotateOnHover: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    showOnHoverOnly: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CellPageLink extends Struct.ComponentSchema {
  collectionName: "components_cell_page_links";
  info: {
    displayName: "Cell Page Link";
    icon: "link";
  };
  attributes: {
    compact: Schema.Attribute.Boolean;
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    pageType: Schema.Attribute.Enumeration<
      [
        "ecommerce",
        "gallery",
        "cyclorama",
        "postproduction",
        "aboutus",
        "discovery",
        "home",
        "clockLanguage",
        "services",
        "etouch",
        "faq",
      ]
    > &
      Schema.Attribute.Required;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
    videoFile: Schema.Attribute.Media;
  };
}

export interface CellService extends Struct.ComponentSchema {
  collectionName: "components_cell_services";
  info: {
    displayName: "Cell Service";
    icon: "briefcase";
  };
  attributes: {
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    external: Schema.Attribute.Boolean;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label_en: Schema.Attribute.String;
    label_fr: Schema.Attribute.String & Schema.Attribute.Required;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CellText extends Struct.ComponentSchema {
  collectionName: "components_cell_texts";
  info: {
    displayName: "Cell Text";
    icon: "file";
  };
  attributes: {
    ctaText_en: Schema.Attribute.String;
    ctaText_fr: Schema.Attribute.String;
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    expandable: Schema.Attribute.Boolean;
    hoverReveal: Schema.Attribute.Boolean;
    href: Schema.Attribute.String;
    image: Schema.Attribute.Media;
    label_en: Schema.Attribute.String;
    label_fr: Schema.Attribute.String;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    paragraphs: Schema.Attribute.Component<"shared.localized-item", true>;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
  };
}

export interface CellVideo extends Struct.ComponentSchema {
  collectionName: "components_cell_videos";
  info: {
    displayName: "Cell Video";
    icon: "play";
  };
  attributes: {
    autoplay: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    desktopCol: Schema.Attribute.Integer;
    desktopRow: Schema.Attribute.Integer;
    href: Schema.Attribute.String;
    label_en: Schema.Attribute.String;
    label_fr: Schema.Attribute.String;
    loop: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    mobileCol: Schema.Attribute.Integer;
    mobileRow: Schema.Attribute.Integer;
    muted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    posterImage: Schema.Attribute.Media;
    size: Schema.Attribute.Enumeration<["default", "wide", "tall", "large"]>;
    videoFile: Schema.Attribute.Media & Schema.Attribute.Required;
  };
}

export interface FooterNavigationGroup extends Struct.ComponentSchema {
  collectionName: "components_footer_navigation_groups";
  info: {
    displayName: "Navigation Group";
    icon: "layer";
  };
  attributes: {
    links: Schema.Attribute.Component<"shared.nav-link", true>;
    title: Schema.Attribute.String;
  };
}

export interface PageGridConfig extends Struct.ComponentSchema {
  collectionName: "components_page_grid_configs";
  info: {
    displayName: "Grid Config";
    icon: "grid";
  };
  attributes: {
    desktopCols: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<4>;
    desktopGridTemplate: Schema.Attribute.Text;
    desktopRows: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<4>;
    mobileCols: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<2>;
    mobileRows: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<8>;
  };
}

export interface SectionBeforeAfter extends Struct.ComponentSchema {
  collectionName: "components_section_before_after";
  info: {
    displayName: "Section Before After";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionCenteredText extends Struct.ComponentSchema {
  collectionName: "components_section_centered_text";
  info: {
    displayName: "Section Centered Text";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionComparisonCards extends Struct.ComponentSchema {
  collectionName: "components_section_comparison_cards";
  info: {
    displayName: "Section comparison cards";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionContactForm extends Struct.ComponentSchema {
  collectionName: "components_section_contact_form";
  info: {
    displayName: "Section Contact Form";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionContent extends Struct.ComponentSchema {
  collectionName: "components_section_contents";
  info: {
    displayName: "Content";
    icon: "file";
  };
  attributes: {
    content_en: Schema.Attribute.RichText;
    content_fr: Schema.Attribute.RichText;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
  };
}

export interface SectionCtaBanner extends Struct.ComponentSchema {
  collectionName: "components_section_cta_banner";
  info: {
    displayName: "Section CTA Banner";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionEquipmentShowcase extends Struct.ComponentSchema {
  collectionName: "components_section_equipment_showcase";
  info: {
    displayName: "Section Equipment Showcase";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionFaq extends Struct.ComponentSchema {
  collectionName: "components_section_faq";
  info: {
    displayName: "Section FAQ";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionFeatureHighlight extends Struct.ComponentSchema {
  collectionName: "components_section_feature_highlight";
  info: {
    displayName: "Section Feature Highlight";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionForm extends Struct.ComponentSchema {
  collectionName: "components_section_forms";
  info: {
    displayName: "Form";
    icon: "pencil";
  };
  attributes: {
    description_en: Schema.Attribute.Text;
    description_fr: Schema.Attribute.Text;
    pricing_en: Schema.Attribute.String;
    pricing_fr: Schema.Attribute.String;
    showDuration: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
  };
}

export interface SectionGallery extends Struct.ComponentSchema {
  collectionName: "components_section_gallery";
  info: {
    displayName: "Section Gallery";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionGalleryBento extends Struct.ComponentSchema {
  collectionName: "components_section_gallery_bentos";
  info: {
    displayName: "Gallery Bento";
    icon: "picture";
  };
  attributes: {
    columns: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 3;
        },
        number
      > &
      Schema.Attribute.DefaultTo<4>;
    images: Schema.Attribute.Component<"shared.image-with-alt", true>;
    subtitle_en: Schema.Attribute.String;
    subtitle_fr: Schema.Attribute.String;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
  };
}

export interface SectionHero extends Struct.ComponentSchema {
  collectionName: "components_section_heroes";
  info: {
    displayName: "Hero";
    icon: "layout";
  };
  attributes: {
    image: Schema.Attribute.Media;
    imageAlt: Schema.Attribute.String;
    intro_en: Schema.Attribute.Text;
    intro_fr: Schema.Attribute.Text;
    subtitle_en: Schema.Attribute.String;
    subtitle_fr: Schema.Attribute.String;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SectionInstagramFeed extends Struct.ComponentSchema {
  collectionName: "components_section_instagram_feed";
  info: {
    displayName: "Section Instagram Feed";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionLocationMap extends Struct.ComponentSchema {
  collectionName: "components_section_location_map";
  info: {
    displayName: "Section Location Map";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionMarquee extends Struct.ComponentSchema {
  collectionName: "components_section_marquee";
  info: {
    displayName: "Section Marquee";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionMediaText extends Struct.ComponentSchema {
  collectionName: "components_section_media_text";
  info: {
    displayName: "Section media text";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionPricingCards extends Struct.ComponentSchema {
  collectionName: "components_section_pricing_cards";
  info: {
    displayName: "Section pricing cards";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionProcessTimeline extends Struct.ComponentSchema {
  collectionName: "components_section_process_timeline";
  info: {
    displayName: "Section Process Timeline";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionRichText extends Struct.ComponentSchema {
  collectionName: "components_section_rich_text";
  info: {
    displayName: "Section rich text";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionStats extends Struct.ComponentSchema {
  collectionName: "components_section_stats";
  info: {
    displayName: "Section Stats";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionTabbedDetails extends Struct.ComponentSchema {
  collectionName: "components_section_tabbed_details";
  info: {
    displayName: "Section Tabbed Details";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionTestimonials extends Struct.ComponentSchema {
  collectionName: "components_section_testimonials";
  info: {
    displayName: "Section Testimonials";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SectionVideoFullwidth extends Struct.ComponentSchema {
  collectionName: "components_section_video_fullwidth";
  info: {
    displayName: "Section Video Fullwidth";
    icon: "layout";
  };
  attributes: {
    data: Schema.Attribute.JSON;
  };
}

export interface SharedAddressEntry extends Struct.ComponentSchema {
  collectionName: "components_shared_address_entries";
  info: {
    displayName: "Address Entry";
    icon: "mapPin";
  };
  attributes: {
    address: Schema.Attribute.String;
    label: Schema.Attribute.String;
  };
}

export interface SharedBentoKeyword extends Struct.ComponentSchema {
  collectionName: "components_shared_bento_keywords";
  info: {
    displayName: "Bento Keyword";
    icon: "key";
  };
  attributes: {
    label: Schema.Attribute.String;
    machine: Schema.Attribute.Relation<"oneToOne", "api::machine.machine">;
  };
}

export interface SharedImageWithAlt extends Struct.ComponentSchema {
  collectionName: "components_shared_image_with_alts";
  info: {
    displayName: "Image With Alt";
    icon: "picture";
  };
  attributes: {
    alt: Schema.Attribute.String;
    image: Schema.Attribute.Media;
  };
}

export interface SharedLabelItem extends Struct.ComponentSchema {
  collectionName: "components_shared_label_items";
  info: {
    displayName: "Label Item";
    icon: "tag";
  };
  attributes: {
    label: Schema.Attribute.String;
  };
}

export interface SharedLocalizedItem extends Struct.ComponentSchema {
  collectionName: "components_shared_localized_items";
  info: {
    displayName: "Localized Item";
    icon: "globe";
  };
  attributes: {
    en: Schema.Attribute.String;
    fr: Schema.Attribute.String;
  };
}

export interface SharedNavLink extends Struct.ComponentSchema {
  collectionName: "components_shared_nav_links";
  info: {
    displayName: "Nav Link";
    icon: "link";
  };
  attributes: {
    external: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    href: Schema.Attribute.String;
    label: Schema.Attribute.String;
  };
}

export interface SharedSocialLink extends Struct.ComponentSchema {
  collectionName: "components_shared_social_links";
  info: {
    displayName: "Social Link";
    icon: "link";
  };
  attributes: {
    label: Schema.Attribute.String;
    platform: Schema.Attribute.String;
    url: Schema.Attribute.String;
  };
}

export interface SharedSpec extends Struct.ComponentSchema {
  collectionName: "components_shared_specs";
  info: {
    displayName: "Spec";
    icon: "list";
  };
  attributes: {
    label_en: Schema.Attribute.String;
    label_fr: Schema.Attribute.String;
    value_en: Schema.Attribute.String;
    value_fr: Schema.Attribute.String;
  };
}

declare module "@strapi/strapi" {
  export module Public {
    export interface ComponentSchemas {
      "cell.chat": CellChat;
      "cell.contact": CellContact;
      "cell.cta": CellCta;
      "cell.details": CellDetails;
      "cell.gallery": CellGallery;
      "cell.image": CellImage;
      "cell.machine": CellMachine;
      "cell.machine-list": CellMachineList;
      "cell.model3d": CellModel3D;
      "cell.page-link": CellPageLink;
      "cell.service": CellService;
      "cell.text": CellText;
      "cell.video": CellVideo;
      "footer.navigation-group": FooterNavigationGroup;
      "page.grid-config": PageGridConfig;
      "section.before-after": SectionBeforeAfter;
      "section.centered-text": SectionCenteredText;
      "section.comparison-cards": SectionComparisonCards;
      "section.contact-form": SectionContactForm;
      "section.content": SectionContent;
      "section.cta-banner": SectionCtaBanner;
      "section.equipment-showcase": SectionEquipmentShowcase;
      "section.faq": SectionFaq;
      "section.feature-highlight": SectionFeatureHighlight;
      "section.form": SectionForm;
      "section.gallery": SectionGallery;
      "section.gallery-bento": SectionGalleryBento;
      "section.hero": SectionHero;
      "section.instagram-feed": SectionInstagramFeed;
      "section.location-map": SectionLocationMap;
      "section.marquee": SectionMarquee;
      "section.media-text": SectionMediaText;
      "section.pricing-cards": SectionPricingCards;
      "section.process-timeline": SectionProcessTimeline;
      "section.rich-text": SectionRichText;
      "section.stats": SectionStats;
      "section.tabbed-details": SectionTabbedDetails;
      "section.testimonials": SectionTestimonials;
      "section.video-fullwidth": SectionVideoFullwidth;
      "shared.address-entry": SharedAddressEntry;
      "shared.bento-keyword": SharedBentoKeyword;
      "shared.image-with-alt": SharedImageWithAlt;
      "shared.label-item": SharedLabelItem;
      "shared.localized-item": SharedLocalizedItem;
      "shared.nav-link": SharedNavLink;
      "shared.social-link": SharedSocialLink;
      "shared.spec": SharedSpec;
    }
  }
}
