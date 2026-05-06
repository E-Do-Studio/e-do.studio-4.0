import type { Schema, Struct } from "@strapi/strapi";

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: "strapi_api_tokens";
  info: {
    description: "";
    displayName: "Api Token";
    name: "Api Token";
    pluralName: "api-tokens";
    singularName: "api-token";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<"">;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::api-token"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      "oneToMany",
      "admin::api-token-permission"
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<["read-only", "full-access", "custom"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"read-only">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: "strapi_api_token_permissions";
  info: {
    description: "";
    displayName: "API Token Permission";
    name: "API Token Permission";
    pluralName: "api-token-permissions";
    singularName: "api-token-permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "admin::api-token-permission"
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<"manyToOne", "admin::api-token">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: "admin_permissions";
  info: {
    description: "";
    displayName: "Permission";
    name: "Permission";
    pluralName: "permissions";
    singularName: "permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::permission"> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<"manyToOne", "admin::role">;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: "admin_roles";
  info: {
    description: "";
    displayName: "Role";
    name: "Role";
    pluralName: "roles";
    singularName: "role";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::role"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<"oneToMany", "admin::permission">;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<"manyToMany", "admin::user">;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: "strapi_sessions";
  info: {
    description: "Session Manager storage";
    displayName: "Session";
    name: "Session";
    pluralName: "sessions";
    singularName: "session";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::session"> &
      Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: "strapi_transfer_tokens";
  info: {
    description: "";
    displayName: "Transfer Token";
    name: "Transfer Token";
    pluralName: "transfer-tokens";
    singularName: "transfer-token";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<"">;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "admin::transfer-token"
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      "oneToMany",
      "admin::transfer-token-permission"
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: "strapi_transfer_token_permissions";
  info: {
    description: "";
    displayName: "Transfer Token Permission";
    name: "Transfer Token Permission";
    pluralName: "transfer-token-permissions";
    singularName: "transfer-token-permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "admin::transfer-token-permission"
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<"manyToOne", "admin::transfer-token">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: "admin_users";
  info: {
    description: "";
    displayName: "User";
    name: "User";
    pluralName: "users";
    singularName: "user";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::user"> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<"manyToMany", "admin::role"> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAboutUsAboutUs extends Struct.SingleTypeSchema {
  collectionName: "about_uses";
  info: {
    displayName: "About Us";
    pluralName: "about-uses";
    singularName: "about-us";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::about-us.about-us"
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    seo_description_en: Schema.Attribute.Text;
    seo_description_fr: Schema.Attribute.Text;
    seo_title_en: Schema.Attribute.String;
    seo_title_fr: Schema.Attribute.String;
    story_en: Schema.Attribute.RichText;
    story_fr: Schema.Attribute.RichText;
    subtitle_en: Schema.Attribute.String;
    subtitle_fr: Schema.Attribute.String;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiBentoPageBentoPage extends Struct.CollectionTypeSchema {
  collectionName: "bento_pages";
  info: {
    displayName: "Bento Page";
    pluralName: "bento-pages";
    singularName: "bento-page";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    cells: Schema.Attribute.DynamicZone<
      [
        "cell.image",
        "cell.text",
        "cell.cta",
        "cell.service",
        "cell.contact",
        "cell.chat",
        "cell.gallery",
        "cell.page-link",
        "cell.machine",
        "cell.machine-list",
        "cell.video",
        "cell.model3d",
        "cell.details",
      ]
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    gridConfig: Schema.Attribute.Component<"page.grid-config", false>;
    indexable: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    internalTitle: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::bento-page.bento-page"
    > &
      Schema.Attribute.Private;
    pathname: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    seo_description: Schema.Attribute.Text;
    seo_image: Schema.Attribute.Media;
    seo_title: Schema.Attribute.String;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiBlogCategoryBlogCategory
  extends Struct.CollectionTypeSchema {
  collectionName: "blog_categories";
  info: {
    displayName: "Blog Category";
    pluralName: "blog-categories";
    singularName: "blog-category";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    description_en: Schema.Attribute.Text;
    description_fr: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::blog-category.blog-category"
    > &
      Schema.Attribute.Private;
    posts: Schema.Attribute.Relation<"manyToMany", "api::blog-post.blog-post">;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID & Schema.Attribute.Required;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiBlogPostBlogPost extends Struct.CollectionTypeSchema {
  collectionName: "blog_posts";
  info: {
    displayName: "Blog Post";
    pluralName: "blog-posts";
    singularName: "blog-post";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    body_en: Schema.Attribute.RichText;
    body_fr: Schema.Attribute.RichText;
    categories: Schema.Attribute.Relation<
      "manyToMany",
      "api::blog-category.blog-category"
    >;
    coverImage: Schema.Attribute.Media;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    excerpt_en: Schema.Attribute.Text;
    excerpt_fr: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::blog-post.blog-post"
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    seo_description: Schema.Attribute.Text;
    seo_image: Schema.Attribute.Media;
    seo_title: Schema.Attribute.String;
    slug: Schema.Attribute.UID & Schema.Attribute.Required;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiCookieBannerCookieBanner extends Struct.SingleTypeSchema {
  collectionName: "cookie_banners";
  info: {
    displayName: "Cookie Banner";
    pluralName: "cookie-banners";
    singularName: "cookie-banner";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    acceptButton_en: Schema.Attribute.String;
    acceptButton_fr: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    customizeButton_en: Schema.Attribute.String;
    customizeButton_fr: Schema.Attribute.String;
    description_en: Schema.Attribute.Text;
    description_fr: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::cookie-banner.cookie-banner"
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    rejectButton_en: Schema.Attribute.String;
    rejectButton_fr: Schema.Attribute.String;
    saveButton_en: Schema.Attribute.String;
    saveButton_fr: Schema.Attribute.String;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiCycloramaCyclorama extends Struct.SingleTypeSchema {
  collectionName: "cycloramas";
  info: {
    displayName: "Cyclorama";
    pluralName: "cycloramas";
    singularName: "cyclorama";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    amenities: Schema.Attribute.Component<"shared.localized-item", true>;
    comfortText_en: Schema.Attribute.Text;
    comfortText_fr: Schema.Attribute.Text;
    complementaryServices_en: Schema.Attribute.Text;
    complementaryServices_fr: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    description_en: Schema.Attribute.Text;
    description_fr: Schema.Attribute.Text;
    equipmentRental_en: Schema.Attribute.Text;
    equipmentRental_fr: Schema.Attribute.Text;
    gallery: Schema.Attribute.Media<undefined, true>;
    image: Schema.Attribute.Media;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::cyclorama.cyclorama"
    > &
      Schema.Attribute.Private;
    pricing_en: Schema.Attribute.String;
    pricing_fr: Schema.Attribute.String;
    pricingDescription_en: Schema.Attribute.Text;
    pricingDescription_fr: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    specs: Schema.Attribute.Component<"shared.spec", true>;
    subtitle_en: Schema.Attribute.String;
    subtitle_fr: Schema.Attribute.String;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiFaqEntryFaqEntry extends Struct.CollectionTypeSchema {
  collectionName: "faq_entries";
  info: {
    displayName: "FAQ Entry";
    pluralName: "faq-entries";
    singularName: "faq-entry";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    answer_en: Schema.Attribute.Text;
    answer_fr: Schema.Attribute.Text & Schema.Attribute.Required;
    category_en: Schema.Attribute.String;
    category_fr: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::faq-entry.faq-entry"
    > &
      Schema.Attribute.Private;
    orderRank: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    question_en: Schema.Attribute.String;
    question_fr: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiFaqPageFaqPage extends Struct.SingleTypeSchema {
  collectionName: "faq_pages";
  info: {
    displayName: "FAQ Page";
    pluralName: "faq-pages";
    singularName: "faq-page";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::faq-page.faq-page"
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    seo_description_en: Schema.Attribute.Text;
    seo_description_fr: Schema.Attribute.Text;
    seo_title_en: Schema.Attribute.String;
    seo_title_fr: Schema.Attribute.String;
    subtitle_en: Schema.Attribute.String;
    subtitle_fr: Schema.Attribute.String;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiFooterFooter extends Struct.SingleTypeSchema {
  collectionName: "footers";
  info: {
    displayName: "Footer";
    pluralName: "footers";
    singularName: "footer";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    addressCity: Schema.Attribute.String;
    addressName: Schema.Attribute.String;
    addressNote_en: Schema.Attribute.String;
    addressNote_fr: Schema.Attribute.String;
    addressStreet: Schema.Attribute.String;
    copyright: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    email: Schema.Attribute.String;
    legalLinks: Schema.Attribute.Component<"shared.nav-link", true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::footer.footer"
    > &
      Schema.Attribute.Private;
    navigationGroups: Schema.Attribute.Component<
      "footer.navigation-group",
      true
    >;
    phone: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    socialLinks: Schema.Attribute.Component<"shared.social-link", true>;
    tagline_en: Schema.Attribute.String;
    tagline_fr: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    weekdayHours_en: Schema.Attribute.String;
    weekdayHours_fr: Schema.Attribute.String;
    weekendHours_en: Schema.Attribute.String;
    weekendHours_fr: Schema.Attribute.String;
  };
}

export interface ApiGalleryAssetGalleryAsset
  extends Struct.CollectionTypeSchema {
  collectionName: "gallery_assets";
  info: {
    displayName: "Gallery Asset";
    pluralName: "gallery-assets";
    singularName: "gallery-asset";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    alt: Schema.Attribute.String;
    brand: Schema.Attribute.Relation<
      "manyToOne",
      "api::gallery-brand.gallery-brand"
    >;
    category: Schema.Attribute.Relation<
      "manyToOne",
      "api::gallery-category.gallery-category"
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    image: Schema.Attribute.Media & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::gallery-asset.gallery-asset"
    > &
      Schema.Attribute.Private;
    mediaType: Schema.Attribute.Enumeration<["image", "video"]>;
    orderRank: Schema.Attribute.Integer;
    originalFilename: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    subcategory: Schema.Attribute.Relation<
      "manyToOne",
      "api::gallery-subcategory.gallery-subcategory"
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiGalleryBrandGalleryBrand
  extends Struct.CollectionTypeSchema {
  collectionName: "gallery_brands";
  info: {
    displayName: "Gallery Brand";
    pluralName: "gallery-brands";
    singularName: "gallery-brand";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::gallery-brand.gallery-brand"
    > &
      Schema.Attribute.Private;
    logo: Schema.Attribute.Media<"images">;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    orderRank: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    url: Schema.Attribute.String;
  };
}

export interface ApiGalleryCategoryGalleryCategory
  extends Struct.CollectionTypeSchema {
  collectionName: "gallery_categories";
  info: {
    displayName: "Gallery Category";
    pluralName: "gallery-categories";
    singularName: "gallery-category";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    assets: Schema.Attribute.Relation<
      "oneToMany",
      "api::gallery-asset.gallery-asset"
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    group: Schema.Attribute.Enumeration<
      [
        "live",
        "eclipse",
        "ghost",
        "pique",
        "horizontal",
        "vertical",
        "packshot",
        "cyclorama",
        "post-prod",
      ]
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::gallery-category.gallery-category"
    > &
      Schema.Attribute.Private;
    name_en: Schema.Attribute.String;
    name_fr: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiGalleryProjectGalleryProject
  extends Struct.CollectionTypeSchema {
  collectionName: "gallery_projects";
  info: {
    displayName: "Gallery Project";
    pluralName: "gallery-projects";
    singularName: "gallery-project";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    brand: Schema.Attribute.Relation<
      "manyToOne",
      "api::gallery-brand.gallery-brand"
    >;
    category: Schema.Attribute.Relation<
      "manyToOne",
      "api::gallery-category.gallery-category"
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    images: Schema.Attribute.Media<"images", true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::gallery-project.gallery-project"
    > &
      Schema.Attribute.Private;
    orderRank: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<"title"> & Schema.Attribute.Required;
    stage: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    year: Schema.Attribute.Integer;
  };
}

export interface ApiGalleryEmbedGalleryEmbed
  extends Struct.CollectionTypeSchema {
  collectionName: "gallery_embeds";
  info: {
    displayName: "Gallery Embed";
    pluralName: "gallery-embeds";
    singularName: "gallery-embed";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    category: Schema.Attribute.Relation<
      "manyToOne",
      "api::gallery-category.gallery-category"
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    embedUrl: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::gallery-embed.gallery-embed"
    > &
      Schema.Attribute.Private;
    order: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    thumbnail: Schema.Attribute.Media;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiGallerySubcategoryGallerySubcategory
  extends Struct.CollectionTypeSchema {
  collectionName: "gallery_subcategories";
  info: {
    displayName: "Gallery Subcategory";
    pluralName: "gallery-subcategories";
    singularName: "gallery-subcategory";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    assets: Schema.Attribute.Relation<
      "oneToMany",
      "api::gallery-asset.gallery-asset"
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::gallery-subcategory.gallery-subcategory"
    > &
      Schema.Attribute.Private;
    name_en: Schema.Attribute.String;
    name_fr: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiMachineMachine extends Struct.CollectionTypeSchema {
  collectionName: "machines";
  info: {
    displayName: "Machine";
    pluralName: "machines";
    singularName: "machine";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    description_en: Schema.Attribute.Text;
    description_fr: Schema.Attribute.Text;
    gallery: Schema.Attribute.Media<undefined, true>;
    image: Schema.Attribute.Media;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::machine.machine"
    > &
      Schema.Attribute.Private;
    operatorPricing_en: Schema.Attribute.String;
    operatorPricing_fr: Schema.Attribute.String;
    orderRank: Schema.Attribute.Integer;
    pricing_en: Schema.Attribute.String;
    pricing_fr: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<"title"> & Schema.Attribute.Required;
    specs: Schema.Attribute.Component<"shared.spec", true>;
    subtitle_en: Schema.Attribute.String;
    subtitle_fr: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    video: Schema.Attribute.Media;
  };
}

export interface ApiModularPageModularPage extends Struct.CollectionTypeSchema {
  collectionName: "modular_pages";
  info: {
    displayName: "Modular Page";
    pluralName: "modular-pages";
    singularName: "modular-page";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    indexable: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    internalTitle: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::modular-page.modular-page"
    > &
      Schema.Attribute.Private;
    pathname: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    sections: Schema.Attribute.DynamicZone<
      [
        "section.hero",
        "section.content",
        "section.form",
        "section.gallery-bento",
        "section.video-fullwidth",
        "section.stats",
        "section.gallery",
        "section.tabbed-details",
        "section.centered-text",
        "section.feature-highlight",
        "section.marquee",
        "section.process-timeline",
        "section.before-after",
        "section.equipment-showcase",
        "section.cta-banner",
        "section.faq",
        "section.location-map",
        "section.instagram-feed",
        "section.testimonials",
        "section.contact-form",
        "section.rich-text",
        "section.media-text",
        "section.pricing-cards",
        "section.comparison-cards",
      ]
    >;
    seo_description: Schema.Attribute.Text;
    seo_image: Schema.Attribute.Media;
    seo_title: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiNotFoundNotFound extends Struct.SingleTypeSchema {
  collectionName: "not_founds";
  info: {
    displayName: "Not Found";
    pluralName: "not-founds";
    singularName: "not-found";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    ctaLabel: Schema.Attribute.String;
    ctaLink: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::not-found.not-found"
    > &
      Schema.Attribute.Private;
    message_en: Schema.Attribute.String;
    message_fr: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    text: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiPostProductionTypePostProductionType
  extends Struct.CollectionTypeSchema {
  collectionName: "post_production_types";
  info: {
    displayName: "Post Production Type";
    pluralName: "post-production-types";
    singularName: "post-production-type";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    description_en: Schema.Attribute.Text;
    description_fr: Schema.Attribute.Text;
    gallery: Schema.Attribute.Media<undefined, true>;
    image: Schema.Attribute.Media;
    includes: Schema.Attribute.Component<"shared.localized-item", true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::post-production-type.post-production-type"
    > &
      Schema.Attribute.Private;
    orderRank: Schema.Attribute.Integer;
    price_en: Schema.Attribute.String;
    price_fr: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID & Schema.Attribute.Required;
    title_en: Schema.Attribute.String;
    title_fr: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface ApiSiteSettingSiteSetting extends Struct.SingleTypeSchema {
  collectionName: "site_settings";
  info: {
    displayName: "Site Settings";
    pluralName: "site-settings";
    singularName: "site-setting";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bentoKeywords: Schema.Attribute.Component<"shared.bento-keyword", true>;
    city: Schema.Attribute.String;
    country: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    defaultSeoDescription: Schema.Attribute.Text;
    defaultSeoImage: Schema.Attribute.Media;
    defaultSeoTitle: Schema.Attribute.String;
    email: Schema.Attribute.String;
    entries: Schema.Attribute.Component<"shared.address-entry", true>;
    fullAddress: Schema.Attribute.String;
    googleAnalyticsId: Schema.Attribute.String;
    googleMapsUrl: Schema.Attribute.String;
    hours_en: Schema.Attribute.String;
    hours_fr: Schema.Attribute.String;
    latitude: Schema.Attribute.Float;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::site-setting.site-setting"
    > &
      Schema.Attribute.Private;
    logo: Schema.Attribute.Media;
    longitude: Schema.Attribute.Float;
    mapsEmbedUrl: Schema.Attribute.String;
    openingHoursSpec: Schema.Attribute.Text;
    parking_en: Schema.Attribute.Text;
    parking_fr: Schema.Attribute.Text;
    phone: Schema.Attribute.String;
    phoneHref: Schema.Attribute.String;
    postalCode: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    siteDescription_en: Schema.Attribute.Text;
    siteDescription_fr: Schema.Attribute.Text;
    siteTitle: Schema.Attribute.String;
    socialLinks: Schema.Attribute.Component<"shared.social-link", true>;
    street: Schema.Attribute.String;
    transport: Schema.Attribute.Component<"shared.label-item", true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    weekendHours_en: Schema.Attribute.String;
    weekendHours_fr: Schema.Attribute.String;
  };
}

export interface ApiTestimonialTestimonial extends Struct.CollectionTypeSchema {
  collectionName: "testimonials";
  info: {
    displayName: "Testimonial";
    pluralName: "testimonials";
    singularName: "testimonial";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    company: Schema.Attribute.String;
    content: Schema.Attribute.Text & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    image: Schema.Attribute.Media;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "api::testimonial.testimonial"
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    orderRank: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    rating: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    role: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: "strapi_releases";
  info: {
    displayName: "Release";
    pluralName: "releases";
    singularName: "release";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::content-releases.release-action"
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::content-releases.release"
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ["ready", "blocked", "failed", "done", "empty"]
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: "strapi_release_actions";
  info: {
    displayName: "Release Action";
    pluralName: "release-actions";
    singularName: "release-action";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::content-releases.release-action"
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::content-releases.release"
    >;
    type: Schema.Attribute.Enumeration<["publish", "unpublish"]> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: "i18n_locale";
  info: {
    collectionName: "locales";
    description: "";
    displayName: "Locale";
    pluralName: "locales";
    singularName: "locale";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::i18n.locale"
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: "strapi_workflows";
  info: {
    description: "";
    displayName: "Workflow";
    name: "Workflow";
    pluralName: "workflows";
    singularName: "workflow";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"[]">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::review-workflows.workflow"
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      "oneToOne",
      "plugin::review-workflows.workflow-stage"
    >;
    stages: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::review-workflows.workflow-stage"
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: "strapi_workflows_stages";
  info: {
    description: "";
    displayName: "Stages";
    name: "Workflow Stage";
    pluralName: "workflow-stages";
    singularName: "workflow-stage";
  };
  options: {
    draftAndPublish: false;
    version: "1.1.0";
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<"#4945FF">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::review-workflows.workflow-stage"
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<"manyToMany", "admin::permission">;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::review-workflows.workflow"
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: "files";
  info: {
    description: "";
    displayName: "File";
    pluralName: "files";
    singularName: "file";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<"manyToOne", "plugin::upload.folder"> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::upload.file"
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<"morphToMany">;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: "upload_folders";
  info: {
    displayName: "Folder";
    pluralName: "folders";
    singularName: "folder";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<"oneToMany", "plugin::upload.folder">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<"oneToMany", "plugin::upload.file">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::upload.folder"
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<"manyToOne", "plugin::upload.folder">;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: "up_permissions";
  info: {
    description: "";
    displayName: "Permission";
    name: "permission";
    pluralName: "permissions";
    singularName: "permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::users-permissions.permission"
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::users-permissions.role"
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: "up_roles";
  info: {
    description: "";
    displayName: "Role";
    name: "role";
    pluralName: "roles";
    singularName: "role";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::users-permissions.role"
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::users-permissions.permission"
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::users-permissions.user"
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: "up_users";
  info: {
    description: "";
    displayName: "User";
    name: "user";
    pluralName: "users";
    singularName: "user";
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::users-permissions.user"
    > &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::users-permissions.role"
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module "@strapi/strapi" {
  export module Public {
    export interface ContentTypeSchemas {
      "admin::api-token": AdminApiToken;
      "admin::api-token-permission": AdminApiTokenPermission;
      "admin::permission": AdminPermission;
      "admin::role": AdminRole;
      "admin::session": AdminSession;
      "admin::transfer-token": AdminTransferToken;
      "admin::transfer-token-permission": AdminTransferTokenPermission;
      "admin::user": AdminUser;
      "api::about-us.about-us": ApiAboutUsAboutUs;
      "api::bento-page.bento-page": ApiBentoPageBentoPage;
      "api::blog-category.blog-category": ApiBlogCategoryBlogCategory;
      "api::blog-post.blog-post": ApiBlogPostBlogPost;
      "api::cookie-banner.cookie-banner": ApiCookieBannerCookieBanner;
      "api::cyclorama.cyclorama": ApiCycloramaCyclorama;
      "api::faq-entry.faq-entry": ApiFaqEntryFaqEntry;
      "api::faq-page.faq-page": ApiFaqPageFaqPage;
      "api::footer.footer": ApiFooterFooter;
      "api::gallery-asset.gallery-asset": ApiGalleryAssetGalleryAsset;
      "api::gallery-brand.gallery-brand": ApiGalleryBrandGalleryBrand;
      "api::gallery-category.gallery-category": ApiGalleryCategoryGalleryCategory;
      "api::gallery-embed.gallery-embed": ApiGalleryEmbedGalleryEmbed;
      "api::gallery-project.gallery-project": ApiGalleryProjectGalleryProject;
      "api::gallery-subcategory.gallery-subcategory": ApiGallerySubcategoryGallerySubcategory;
      "api::machine.machine": ApiMachineMachine;
      "api::modular-page.modular-page": ApiModularPageModularPage;
      "api::not-found.not-found": ApiNotFoundNotFound;
      "api::post-production-type.post-production-type": ApiPostProductionTypePostProductionType;
      "api::site-setting.site-setting": ApiSiteSettingSiteSetting;
      "api::testimonial.testimonial": ApiTestimonialTestimonial;
      "plugin::content-releases.release": PluginContentReleasesRelease;
      "plugin::content-releases.release-action": PluginContentReleasesReleaseAction;
      "plugin::i18n.locale": PluginI18NLocale;
      "plugin::review-workflows.workflow": PluginReviewWorkflowsWorkflow;
      "plugin::review-workflows.workflow-stage": PluginReviewWorkflowsWorkflowStage;
      "plugin::upload.file": PluginUploadFile;
      "plugin::upload.folder": PluginUploadFolder;
      "plugin::users-permissions.permission": PluginUsersPermissionsPermission;
      "plugin::users-permissions.role": PluginUsersPermissionsRole;
      "plugin::users-permissions.user": PluginUsersPermissionsUser;
    }
  }
}
