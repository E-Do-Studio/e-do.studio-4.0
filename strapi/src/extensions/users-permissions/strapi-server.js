'use strict';

/**
 * Hide the auto-generated `User` content-type (provided by
 * @strapi/plugin-users-permissions) from the Content Manager sidebar
 * and the Content-Type Builder.
 *
 * Why: the website is public-only — it consumes Strapi anonymously
 * via the `Public` role and does not log users in. The User
 * collection is therefore empty in the admin and only adds visual
 * noise. Hiding (not removing) preserves the role/permission machinery
 * that the public read endpoints need.
 *
 * Strapi 5 schema shape: contentTypes.user.schema.pluginOptions
 * controls admin visibility. Setting both `content-manager.visible`
 * and `content-type-builder.visible` to false drops the CT from the
 * sidebar list and from the content-type builder.
 *
 * To re-show the CT (e.g. when adding a customer-facing auth flow),
 * delete this file or flip the flags to true.
 */
module.exports = (plugin) => {
  const userSchema = plugin?.contentTypes?.user?.schema ?? plugin?.contentTypes?.user;
  if (!userSchema) {
    return plugin;
  }
  userSchema.pluginOptions = {
    ...(userSchema.pluginOptions ?? {}),
    'content-manager': {
      ...(userSchema.pluginOptions?.['content-manager'] ?? {}),
      visible: false,
    },
    'content-type-builder': {
      ...(userSchema.pluginOptions?.['content-type-builder'] ?? {}),
      visible: false,
    },
  };
  return plugin;
};
