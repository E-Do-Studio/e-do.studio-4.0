import type { Schema, Struct } from "@strapi/strapi";

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
    text: Schema.Attribute.String;
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
    label: Schema.Attribute.String;
    value: Schema.Attribute.String;
  };
}

declare module "@strapi/strapi" {
  export module Public {
    export interface ComponentSchemas {
      "shared.address-entry": SharedAddressEntry;
      "shared.bento-keyword": SharedBentoKeyword;
      "shared.label-item": SharedLabelItem;
      "shared.localized-item": SharedLocalizedItem;
      "shared.social-link": SharedSocialLink;
      "shared.spec": SharedSpec;
    }
  }
}
