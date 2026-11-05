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
];
