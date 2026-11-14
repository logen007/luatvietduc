// Stable storage values preserve existing sessions, ownership and rollback compatibility.
export const roleOptions=[{label:'Admin',value:'owner'},{label:'Chuyên viên',value:'support'},{label:'User',value:'member'}];
export const roleLabel=(role:string)=>roleOptions.find(option=>option.value===role)?.label||'Chuyên viên';
