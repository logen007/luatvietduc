import {vi} from '@payloadcms/translations/languages/vi';

// The staff console is Vietnamese. Public VI/DE content has its own locale.
// Restricting the supported set also handles old English language cookies.
export const adminI18n={
 fallbackLanguage:'vi' as const,
 supportedLanguages:{vi},
 translations:{vi:{
  general:{createNew:'Thêm mới',createNewLabel:'Thêm mới {{label}}',searchBy:'Tìm theo {{label}}'},
  fields:{chooseFromExisting:'Chọn tệp'},
  upload:{fileName:'Tên tệp',fileSize:'Dung lượng tệp'},
  version:{publishChanges:'Xuất bản'},
 }},
};
