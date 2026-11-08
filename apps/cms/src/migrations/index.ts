import * as guestChatExpiry from './20261109_010000_guest_chat_expiry';
import * as chatQualification from './20261106_210000_chat_qualification';
import * as mediaFamilies from './20261105_210000_media_families';
import * as knowledgeTaxonomies from './20261106_160000_knowledge_taxonomies';
import * as mediaMetadata from './20261105_190000_media_metadata';
import * as quickReplies from './20261105_170000_quick_replies';
import * as privateKnowledge from './20261105_150000_private_ai_knowledge';
import * as articleTranslations from './20261105_130000_article_translations';
import * as emailAccounts from './20261105_110000_email_accounts';
import * as answerQueue from './20261104_130000_answer_queue';
import * as threeRoles from './20261104_100000_three_user_roles';
import * as chatFiles from './20261104_090000_chat_files';
import * as bundledMedia from './20261104_080000_bundled_media';
import * as legacyDrafts from './20261104_070000_legacy_drafts';
import * as migration_20261103_035530 from './20261103_035530';
import * as migration_20261103_054930_modular_system from './20261103_054930_modular_system';

import * as ai from './20261103_060000_ai_limits';
import * as integrations from './20261103_150000_integrations';
import * as backupAdmin from './20261104_010000_backup_admin';
import * as faqAssistant from './20261104_030000_faq_assistant';
import * as sharedKnowledge from './20261104_040000_shared_knowledge_search';
import * as semanticKnowledge from './20261104_050000_semantic_knowledge';
import * as editorialTaxonomies from './20261104_060000_editorial_taxonomies';
import * as brandDimensions from './20261107_060000_brand_dimensions';
import * as userAvatar from './20261107_110000_user_avatar';
import * as heroBanner from './20261107_180000_hero_banner';
import * as googleMeasurement from './20261108_120000_google_measurement';
import * as customerContact from './20261108_150000_customer_contact';
export const migrations = [
  {
    up: migration_20261103_035530.up,
    down: migration_20261103_035530.down,
    name: '20261103_035530',
  },
  {
    up: migration_20261103_054930_modular_system.up,
    down: migration_20261103_054930_modular_system.down,
    name: '20261103_054930_modular_system'
  },
 {up:ai.up,down:ai.down,name:'20261103_060000_ai_limits'},
 {up:integrations.up,down:integrations.down,name:'20261103_150000_integrations'},
 {up:backupAdmin.up,down:backupAdmin.down,name:'20261104_010000_backup_admin'},
 {up:faqAssistant.up,down:faqAssistant.down,name:'20261104_030000_faq_assistant'},
 {up:sharedKnowledge.up,down:sharedKnowledge.down,name:'20261104_040000_shared_knowledge_search'},
 {up:semanticKnowledge.up,down:semanticKnowledge.down,name:'20261104_050000_semantic_knowledge'},
 {up:editorialTaxonomies.up,down:editorialTaxonomies.down,name:'20261104_060000_editorial_taxonomies'},
 {up:legacyDrafts.up,down:legacyDrafts.down,name:'20261104_070000_legacy_drafts'},
 {up:bundledMedia.up,down:bundledMedia.down,name:'20261104_080000_bundled_media'},
 {up:chatFiles.up,down:chatFiles.down,name:'20261104_090000_chat_files'},
 {up:threeRoles.up,down:threeRoles.down,name:'20261104_100000_three_user_roles'},
 {up:answerQueue.up,down:answerQueue.down,name:'20261104_130000_answer_queue'},
 {up:emailAccounts.up,down:emailAccounts.down,name:'20261105_110000_email_accounts'},
 {up:articleTranslations.up,down:articleTranslations.down,name:'20261105_130000_article_translations'},
 {up:privateKnowledge.up,down:privateKnowledge.down,name:'20261105_150000_private_ai_knowledge'},
 {up:quickReplies.up,down:quickReplies.down,name:'20261105_170000_quick_replies'},
 {up:mediaMetadata.up,down:mediaMetadata.down,name:'20261105_190000_media_metadata'},
 {up:mediaFamilies.up,down:mediaFamilies.down,name:'20261105_210000_media_families'},
 {up:knowledgeTaxonomies.up,down:knowledgeTaxonomies.down,name:'20261106_160000_knowledge_taxonomies'},
 {up:chatQualification.up,down:chatQualification.down,name:'20261106_210000_chat_qualification'},
 {up:brandDimensions.up,down:brandDimensions.down,name:'20261107_060000_brand_dimensions'},
 {up:userAvatar.up,down:userAvatar.down,name:'20261107_110000_user_avatar'},
 {up:heroBanner.up,down:heroBanner.down,name:'20261107_180000_hero_banner'},
 {up:googleMeasurement.up,down:googleMeasurement.down,name:'20261108_120000_google_measurement'},
 {up:customerContact.up,down:customerContact.down,name:'20261108_150000_customer_contact'},
 {up:guestChatExpiry.up,down:guestChatExpiry.down,name:'20261109_010000_guest_chat_expiry'},
];
