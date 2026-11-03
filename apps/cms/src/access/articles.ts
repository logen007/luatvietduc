import type { Access, AccessArgs, AccessResult, Where, CollectionBeforeChangeHook } from 'payload'

const staffRoles = ['editor', 'reviewer']
const contentKeys = ['title', 'body', 'jurisdiction', 'language', 'sourceUrl', 'slug']
export const publicArticles: Where = {and: [{_status: {equals: 'published'}}, {reviewState: {equals: 'approved'}}]}

export const scopedStaff = ({req}: AccessArgs): AccessResult => {
  if (req.user?.role === 'owner') return true
  if (!req.user || !staffRoles.includes(req.user.role)) return false
  const countries = (req.user.jurisdictions || []).filter(j => j === 'VN' || j === 'DE')
  return countries.length ? {jurisdiction: {in: countries}} : false
}

export const readArticles: Access = args => {
  const scope = scopedStaff(args)
  return scope === true ? true : scope === false ? publicArticles : {or: [scope, publicArticles]}
}

export const createArticle: Access = ({req, data}) => req.user?.role === 'owner' || Boolean(
  req.user?.role === 'editor' && data?.jurisdiction && req.user.jurisdictions?.includes(data.jurisdiction),
)

export const articleWorkflow: CollectionBeforeChangeHook = ({data, originalDoc, req}) => {
  const role = req.user?.role
  const isOwner = role === 'owner'
  const jurisdiction = data.jurisdiction ?? originalDoc?.jurisdiction
  if (!isOwner && (!role || !staffRoles.includes(role) || !req.user?.jurisdictions?.includes(jurisdiction))) {
    throw new Error('Article jurisdiction access denied')
  }
  const changed = originalDoc && contentKeys.some(k => k in data && data[k] !== originalDoc[k])
  if (!isOwner && role !== 'editor' && (!originalDoc || changed)) throw new Error('Content editing restricted')
  if (changed) {
    data.reviewState = 'draft'
    data._status = 'draft'
    data.aiAllowed = false
  }
  const previousReview = originalDoc?.reviewState ?? 'draft'
  const review = data.reviewState ?? previousReview
  if (!isOwner && review !== previousReview) {
    const allowed = role === 'editor'
      ? ['draft', 'pending'].includes(review)
      : role === 'reviewer' && ['pending', 'approved'].includes(previousReview) && ['approved', 'withdrawn', 'draft'].includes(review)
    if (!changed && !allowed) throw new Error('Review transition denied')
  }
  const status = data._status ?? originalDoc?._status ?? 'draft'
  if (!isOwner && !changed && status !== (originalDoc?._status ?? 'draft') && role !== 'reviewer') {
    throw new Error('Publication restricted')
  }
  if (review !== 'approved') {data._status = 'draft'; data.aiAllowed = false}
  if (status === 'published' && review !== 'approved' && !changed && review === previousReview) throw new Error('Review required')
  if (data.aiAllowed === true && !isOwner) throw new Error('AI eligibility restricted')
  return data
}
