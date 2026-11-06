import assert from "node:assert/strict";
import { getPayload, type CollectionBeforeChangeHook } from "payload";
import config from "../src/payload.config";
import { articleLock } from "../src/modules/content/audit";
const url = new URL(process.env.DATABASE_URL || "");
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/lvd_test"
)
  throw new Error("Use isolated localhost lvd_test only");
const payload = await getPayload({ config });
try {
  const suffix = crypto.randomUUID();
  const owner = await payload.create({
    collection: "users",
    overrideAccess: true,
    context: { bootstrapOwner: true },
    data: {
      name: "CI owner",
      email: `owner-${suffix}@example.invalid`,
      password: crypto.randomUUID(),
      role: "owner",
    },
  });
  const password = crypto.randomUUID();
  const editor = await payload.create({
    collection: "users",
    overrideAccess: false,
    user: owner,
    data: {
      name: "CI editor",
      email: `editor-${suffix}@example.invalid`,
      password,
      role: "support",
      jurisdictions: ["VN"],
    },
  });
  const login = await payload.login({
    collection: "users",
    data: { email: editor.email, password },
  });
  assert.ok(login.token);
  await assert.rejects(() =>
    payload.create({
      collection: "users",
      overrideAccess: false,
      user: editor,
      data: {
        name: "Escalation",
        email: `bad-${suffix}@example.invalid`,
        password,
        role: "owner",
      },
    }),
  );
  const article = await payload.create({
    collection: "articles",
    overrideAccess: false,
    user: editor,
    data: {
      title: "CI draft",
      slug: suffix,
      body: "Test content only",
      jurisdiction: "VN",
      language: "vi",
    },
  });
  assert.equal(
    (
      await payload.find({
        collection: "articles",
        overrideAccess: false,
        where: { id: { equals: article.id } },
      })
    ).totalDocs,
    0,
  );
  await payload.update({
      collection: "articles",
      id: article.id,
      overrideAccess: false,
      user: editor,
      data: { _status: "published", reviewState: "approved" },
    });
  await payload.update({
    collection: "articles",
    id: article.id,
    overrideAccess: false,
    user: owner,
    data: { reviewState: "approved", _status: "published" },
  });
  assert.equal(
    (
      await payload.find({
        collection: "articles",
        overrideAccess: false,
        where: { id: { equals: article.id } },
      })
    ).totalDocs,
    1,
  );
  await payload.update({
    collection: "articles",
    id: article.id,
    overrideAccess: false,
    user: editor,
    data: { body: "Changed after review", _status:"draft",reviewState:"draft" },
  });
  assert.equal(
    (
      await payload.find({
        collection: "articles",
        overrideAccess: false,
        where: { id: { equals: article.id } },
      })
    ).totalDocs,
    0,
  );
  const reviewer = await payload.create({
    collection: "users",
    overrideAccess: false,
    user: owner,
    data: {
      name: "CI reviewer",
      email: `reviewer-${suffix}@example.invalid`,
      password,
      role: "support",
      jurisdictions: ["VN"],
    },
  });
  const publisher = await payload.create({
    collection: "users",
    overrideAccess: false,
    user: owner,
    data: {
      name: "CI publisher",
      email: `publisher-${suffix}@example.invalid`,
      password,
      role: "member",
      jurisdictions: ["VN"],
    },
  });
  const foreign = await payload.create({
    collection: "users",
    overrideAccess: false,
    user: owner,
    data: {
      name: "CI DE reviewer",
      email: `foreign-${suffix}@example.invalid`,
      password,
      role: "support",
      jurisdictions: ["DE"],
    },
  });
  const crossCountry = await payload.create({
      collection: "articles",
      overrideAccess: false,
      user: editor,
      data: {
        title: "CI cross-country specialist draft",
        slug: `foreign-${suffix}`,
        body: "Test",
        jurisdiction: "DE",
        language: "de",
      },
    });
  assert.equal(crossCountry.jurisdiction,"DE","Specialists can create articles outside their listed countries");
  await payload.delete({collection:'articles',id:crossCountry.id,user:editor,overrideAccess:false});
  await payload.update({
    collection: "articles",
    id: article.id,
    overrideAccess: false,
    user: editor,
    data: { reviewState: "pending" },
  });
  const crossCountryPublication = await payload.update({
      collection: "articles",
      id: article.id,
      overrideAccess: false,
      user: foreign,
      data: { reviewState: "approved", _status:"published" },
    });
  assert.equal(crossCountryPublication._status,'published','Specialists can publish another country’s article');
  assert.equal(typeof crossCountryPublication.reviewedBy==='object'?crossCountryPublication.reviewedBy?.id:crossCountryPublication.reviewedBy,foreign.id);
  await assert.rejects(() =>
    payload.update({
      collection: "articles",
      id: article.id,
      overrideAccess: false,
      user: publisher,
      data: { _status: "published" },
    }),
  );
  await payload.update({
    collection: "articles",
    id: article.id,
    overrideAccess: false,
    user: reviewer,
    data: { reviewState: "approved", _status: "published" },
  });
  assert.equal(
    (
      await payload.find({
        collection: "articles",
        overrideAccess: false,
        user: editor,
        where: { id: { equals: article.id } },
      })
    ).totalDocs,
    1,
  );
  await payload.update({
    collection: "articles",
    id: article.id,
    overrideAccess: false,
    user: reviewer,
    data: { reviewState: "withdrawn" },
  });
  assert.equal(
    (
      await payload.find({
        collection: "articles",
        overrideAccess: false,
        where: { id: { equals: article.id } },
      })
    ).totalDocs,
    0,
  );
  const concurrent = await payload.create({
    collection: "articles",
    overrideAccess: false,
    user: owner,
    data: {
      title: "Concurrent synthetic",
      slug: `race-${suffix}`,
      body: "Original",
      jurisdiction: "VN",
      language: "vi",
    },
  });
  const hooks = payload.collections.articles.config.hooks.beforeChange;
  assert.ok(hooks);
  const lockIndex = hooks.indexOf(articleLock);
  assert.notEqual(lockIndex, -1, "The concurrency barrier must precede articleLock");
  const snapshots: string[] = [];
  let releaseBarrier!: () => void;
  let rejectBarrier!: (error: Error) => void;
  const barrier = new Promise<void>((resolve, reject) => {
    releaseBarrier = resolve;
    rejectBarrier = reject;
  });
  let barrierTimeout: ReturnType<typeof setTimeout> | undefined;
  const raceBarrier: CollectionBeforeChangeHook = async ({
    data,
    originalDoc,
    context,
  }) => {
    if (
      originalDoc?.id === concurrent.id &&
      context.editorialRaceTest === suffix
    ) {
      // Both operations must have read their document before either acquires the row lock.
      snapshots.push(String(originalDoc.updatedAt));
      if (snapshots.length === 1) {
        barrierTimeout = setTimeout(
          () => rejectBarrier(new Error("Timed out waiting for both editorial snapshots")),
          10_000,
        );
      }
      if (snapshots.length === 2) releaseBarrier();
      await barrier;
    }
    return data;
  };
  hooks.splice(lockIndex, 0, raceBarrier);
  try {
    const race = await Promise.allSettled([
      payload.update({
        collection: "articles",
        id: concurrent.id,
        overrideAccess: false,
        user: owner,
        context: { editorialRaceTest: suffix },
        data: { body: "First edit" },
      }),
      payload.update({
        collection: "articles",
        id: concurrent.id,
        overrideAccess: false,
        user: owner,
        context: { editorialRaceTest: suffix },
        data: { body: "Second edit" },
      }),
    ]);
    assert.equal(snapshots.length, 2, "Both writers must reach the snapshot barrier");
    assert.equal(snapshots[0], snapshots[1], "Both writers must hold the same snapshot");
    assert.equal(
      race.filter((result) => result.status === "fulfilled").length,
      1,
      "Concurrent editorial writes must reject one stale snapshot",
    );
    const rejected = race.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    assert.equal(rejected.length, 1);
    assert.ok(rejected[0].reason instanceof Error);
    assert.match(rejected[0].reason.message, /Article changed concurrently\. Reload before saving\./);
    const persisted = await payload.findByID({
      collection: "articles",
      id: concurrent.id,
      overrideAccess: false,
      user: owner,
    });
    assert.equal(
      persisted.body,
      race[0].status === "fulfilled" ? "First edit" : "Second edit",
      "The rejected writer must not change the winning document",
    );
  } finally {
    clearTimeout(barrierTimeout);
    const barrierIndex = hooks.indexOf(raceBarrier);
    if (barrierIndex !== -1) hooks.splice(barrierIndex, 1);
  }
  for (const body of ["Serial first edit", "Serial second edit"]) {
    const updated = await payload.update({
      collection: "articles",
      id: concurrent.id,
      overrideAccess: false,
      user: owner,
      data: { body },
    });
    assert.equal(updated.body, body, "Serial writes with fresh snapshots must succeed");
  }
  console.log(
    "Database checks passed: login, privilege isolation, draft visibility, publication and re-review",
  );
} finally {
  await payload.destroy();
}
