import { factories } from '@strapi/strapi';
// @ts-expect-error new content-type not yet in generated typings
export default factories.createCoreController('api::team-member.team-member');
