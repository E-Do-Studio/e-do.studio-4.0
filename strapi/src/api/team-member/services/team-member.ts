import { factories } from '@strapi/strapi';
// @ts-expect-error new content-type not yet in generated typings
export default factories.createCoreService('api::team-member.team-member');
