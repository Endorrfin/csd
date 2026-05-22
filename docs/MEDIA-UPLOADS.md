# Media uploads — `csd-media` bucket (CORS & lifecycle)

How user-facing image uploads work, what the `csd-media` S3 bucket must allow, and
how to keep it from filling up with abandoned files. Written when testimonial
evidence uploads were added (May 2026). Verify against the code when in doubt —
the upload logic lives in `backend/src/modules/upload/`.

## Two upload flows, two endpoints

| Flow | Endpoint | Auth | S3 method | Key prefix |
| --- | --- | --- | --- | --- |
| Blog images | `POST /api/upload/presigned-url` | MANAGER / ADMIN | presigned **PUT** | `media/blog/` |
| Testimonial evidence | `POST /api/upload/testimonial-presigned` | **public** (anonymous) | presigned **POST** | `media/testimonials/` |

The testimonial form is anonymous, so its upload endpoint has no guard. Because we
cannot trust an anonymous caller, the size/type limits are enforced by S3 itself
(not just the client) — see below.

## Why a presigned POST (not PUT) for testimonials

A presigned **PUT** URL cannot constrain the uploaded object's size: the client
chooses the body. A presigned **POST** carries a signed policy with conditions S3
enforces on receipt. We set (`upload.service.ts`, `getTestimonialPresignedPost`):

- `["content-length-range", 1, 5242880]` — reject anything over 5 MB.
- `["eq", "$Content-Type", contentType]` — pin the declared image type.
- Allowed types: `image/jpeg`, `image/png`, `image/webp`.
- Unique random key under `media/testimonials/`, presigned URL expires in 5 min.

The browser also validates type/size and downscales large images to 1920 px before
upload (`testimonial-form.ts` / `testimonial-edit.ts`), but that is a UX nicety —
the bucket policy is the real guard.

## Required CORS on `csd-media`

A presigned POST sends `multipart/form-data` from the site origin, which triggers a
CORS preflight. The bucket must allow cross-origin `POST` from the app origins, or
the browser blocks reading the (otherwise successful, `204 No Content`) response.

> Note: the blog presigned **PUT** flow already works cross-origin in practice, so
> some CORS config may predate this change. Make sure the rule below at minimum
> adds `POST` and the production + localhost origins.

Config is committed at [`infra/s3-csd-media-cors.json`](../infra/s3-csd-media-cors.json):

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://localhost:4200",
        "https://www.csd-fund.org",
        "https://csd-fund.org"
      ],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Location"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Apply and verify:

```bash
aws s3api put-bucket-cors \
  --bucket csd-media \
  --cors-configuration file://infra/s3-csd-media-cors.json

aws s3api get-bucket-cors --bucket csd-media
```

Add new front-end origins (e.g. a staging domain) to `AllowedOrigins` and re-apply.

## Public read of uploaded images

Stored photos are shown publicly only after a manager approves the testimonial, but
the object itself must be readable to render. Reads go through CloudFront when
`AWS_CLOUDFRONT_MEDIA_URL` is set (same as blog); `publicUrl` is built with that host
and falls back to the direct S3 URL otherwise. No change to read access is needed
beyond what blog images already use.

## Abandoned files & lifecycle

Every anonymous submission uploads its photos immediately, but a testimonial stays
`pending` until moderated and may be rejected or never approved. Those objects stay
in `media/testimonials/` unreferenced. Storage is cheap, so the pragmatic default is
to accept them. If abuse or cost becomes a concern, harden in one of two ways.

**Do NOT** put a blanket expiration on the whole `media/testimonials/` prefix — it
would also delete the photos of approved, published testimonials, which live under
the same prefix today.

Safe options:

1. **Two-stage prefix (cleanest).** Upload to `media/testimonials/pending/`; on
   approval, have the backend copy the object to `media/testimonials/published/` and
   update `photos[].url`. Then a lifecycle rule can expire only `pending/`:

   ```json
   {
     "Rules": [
       {
         "ID": "expire-unmoderated-testimonial-evidence",
         "Filter": { "Prefix": "media/testimonials/pending/" },
         "Status": "Enabled",
         "Expiration": { "Days": 30 }
       }
     ]
   }
   ```

   ```bash
   aws s3api put-bucket-lifecycle-configuration \
     --bucket csd-media \
     --lifecycle-configuration file://infra/s3-csd-media-lifecycle.json
   ```

   This requires a backend change on approval (copy + re-point URL) that is not
   implemented yet.

2. **Periodic reconciliation job.** A scheduled task lists objects under
   `media/testimonials/` and deletes any whose URL is not referenced by a row in the
   `testimonials` table (`photos` JSONB). Slower to build but needs no upload-path
   change.

Until one of these is in place, evidence files are retained indefinitely.
```
