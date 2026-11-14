import type {
  Access,
  AccessArgs,
  AccessResult,
  Where,
  CollectionBeforeChangeHook,
} from "payload";
import {canWriteContent} from '../modules/identity/permissions';

const staffRoles = ["editor", "reviewer","knowledge","support"];
const contentKeys = [
  "title",
  "body",
  "jurisdiction",
  "language",
  "sourceUrl",
  "slug",
  "effectiveFrom",
  "reviewDueAt",
  "legalField",
  "categories",
  "tags",
];
export const publicArticles: Where = {
  and: [
    { _status: { equals: "published" } },
    { reviewState: { equals: "approved" } },
  ],
};

export const scopedStaff = ({ req }: AccessArgs): AccessResult => {
  if (canWriteContent(req.user)) return true;
  if (!req.user || !staffRoles.includes(req.user.role)) return false;
  const countries = (req.user.jurisdictions || []).filter(
    (j) => j === "VN" || j === "DE",
  );
  return countries.length ? { jurisdiction: { in: [...countries,"BOTH"] } } : false;
};

export const readArticles: Access = (args) => {
  const scope = scopedStaff(args);
  return scope === true
    ? true
    : scope === false
      ? publicArticles
      : { or: [scope, publicArticles] };
};

export const createArticle: Access = ({ req, data }) =>
  canWriteContent(req.user) ||
  Boolean(
    ["editor","knowledge","support"].includes(req.user?.role||"") && req.user?.jurisdictions?.length &&
      (!data?.jurisdiction||data.jurisdiction==="BOTH"||req.user.jurisdictions?.includes(data.jurisdiction)),
  );

export const articleWorkflow: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
}) => {
  // Retain compatibility checks while older releases/sessions roll forward.
  const role = req.user?.role as string | undefined;
  const isOwner = role === "owner";
  const jurisdiction = data.jurisdiction ?? originalDoc?.jurisdiction;
  if (
    !canWriteContent(req.user) &&
    (!role ||
      !staffRoles.includes(role) ||
      !(jurisdiction==="BOTH"?req.user?.jurisdictions?.length:req.user?.jurisdictions?.includes(jurisdiction)))
  ) {
    throw new Error("Article jurisdiction access denied");
  }
  if (role === "editor" && data.reviewState === "approved" && originalDoc?.reviewState !== "approved") throw new Error("Review transition denied");
  const sameContent = (key: string) => {
    if (["categories","tags"].includes(key)) {
      const ids = (value: any) => (value || []).map((item: any) => typeof item === "object" ? item.id : item).sort();
      return JSON.stringify(ids(data[key])) === JSON.stringify(ids(originalDoc?.[key]));
    }
    return data[key] === originalDoc?.[key];
  };
  const changed =
    originalDoc &&
    contentKeys.some((k) => k in data && !sameContent(k));
  if(['knowledge','support'].includes(role||'')){
    if(data.reviewState==='withdrawn'){data._status='draft';data.aiAllowed=false;}
    else if((data._status??originalDoc?._status)==='published'){
      data.reviewState='approved';data.reviewedBy=req.user?.id;data.reviewedAt=new Date().toISOString();
    }
    return data;
  }
  // The owner's explicit Publish action is also their approval. Ordinary
  // edits and Save draft still follow the existing withdrawal rules.
  if(isOwner&&data._status==='published'&&(data.reviewState??originalDoc?.reviewState)!=='withdrawn'){
    data.reviewState='approved';data.reviewedBy=req.user?.id;data.reviewedAt=new Date().toISOString();
  }
  const explicitOwnerReview=isOwner&&data._status==='published'&&data.reviewState==='approved';
  if (!isOwner && role !== "editor" && (!originalDoc || changed))
    throw new Error("Content editing restricted");
  if (changed && !explicitOwnerReview) {
    data.reviewState = "draft";
    data._status = "draft";
    data.aiAllowed = false;
  }
  if (changed && !explicitOwnerReview) {
    data.reviewedBy = null;
    data.reviewedAt = null;
  }
  if (
    data.reviewState === "approved" &&
    originalDoc?.reviewState !== "approved"
  ) {
    data.reviewedBy = req.user?.id;
    data.reviewedAt = new Date().toISOString();
  }
  const previousReview = originalDoc?.reviewState ?? "draft";
  const review = data.reviewState ?? previousReview;
  if (!isOwner && review !== previousReview) {
    const allowed =
      role === "editor"
        ? ["draft", "pending"].includes(review)
        : role === "reviewer" &&
          ["pending", "approved"].includes(previousReview) &&
          ["approved", "withdrawn", "draft"].includes(review);
    if (!changed && !allowed) throw new Error("Review transition denied");
  }
  const status = data._status ?? originalDoc?._status ?? "draft";
  if (
    !isOwner &&
    !changed &&
    status !== (originalDoc?._status ?? "draft") &&
    role !== "reviewer"
  ) {
    throw new Error("Publication restricted");
  }
  if (review !== "approved") {
    data._status = "draft";
    data.aiAllowed = false;
  }
  if (
    status === "published" &&
    review !== "approved" &&
    !changed &&
    review === previousReview
  )
    throw new Error("Review required");
  if (data.aiAllowed === true && !isOwner && role!=="reviewer")
    throw new Error("AI eligibility restricted");
  return data;
};
