// === ADDED: PR-2 UploadService spec — recovery/needs presigned methods ===
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  PHOTO_MAX_BYTES,
  DOCUMENT_MAX_BYTES,
} from '../needs/recovery.constants';

jest.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: jest.fn(),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const createPresignedPostMock = createPresignedPost as jest.Mock;
const getSignedUrlMock = getSignedUrl as jest.Mock;

const makeConfig = (values: Record<string, string>): ConfigService =>
  ({
    get: (key: string, def?: string) => values[key] ?? def,
  }) as unknown as ConfigService;

const withPrivateBucket = () =>
  new UploadService(
    makeConfig({
      AWS_REGION: 'eu-central-1',
      AWS_S3_MEDIA_BUCKET: 'csd-media',
      AWS_S3_PRIVATE_BUCKET: 'csd-media-private',
    }),
  );

describe('UploadService — recovery/needs uploads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createPresignedPostMock.mockResolvedValue({
      url: 'https://s3.example',
      fields: { key: 'k' },
    });
    getSignedUrlMock.mockResolvedValue('https://signed.example/get');
  });

  describe('getNeedsPresignedPost', () => {
    it('creates a photo POST under the photo prefix with the 5MB cap', async () => {
      const svc = withPrivateBucket();
      const res = await svc.getNeedsPresignedPost('photo', 'image/jpeg');

      expect(res.s3Key).toMatch(/^media\/needs\/recovery\/photo\/.*\.jpg$/);
      const call = createPresignedPostMock.mock.calls[0] as [
        unknown,
        { Bucket: string; Conditions: unknown[] },
      ];
      const arg = call[1];
      expect(arg.Bucket).toBe('csd-media-private');
      expect(arg.Conditions).toContainEqual([
        'content-length-range',
        1,
        PHOTO_MAX_BYTES,
      ]);
    });

    it('creates a document POST under the doc prefix with the 15MB cap', async () => {
      const svc = withPrivateBucket();
      const res = await svc.getNeedsPresignedPost(
        'document',
        'application/pdf',
      );

      expect(res.s3Key).toMatch(/^media\/needs\/recovery\/doc\/.*\.pdf$/);
      const call = createPresignedPostMock.mock.calls[0] as [
        unknown,
        { Conditions: unknown[] },
      ];
      const arg = call[1];
      expect(arg.Conditions).toContainEqual([
        'content-length-range',
        1,
        DOCUMENT_MAX_BYTES,
      ]);
    });

    it('rejects a mime type not allowed for the kind (pdf as photo)', async () => {
      const svc = withPrivateBucket();
      await expect(
        svc.getNeedsPresignedPost('photo', 'application/pdf'),
      ).rejects.toThrow(BadRequestException);
      expect(createPresignedPostMock).not.toHaveBeenCalled();
    });

    it('throws when the private bucket is not configured', async () => {
      const svc = new UploadService(
        makeConfig({ AWS_REGION: 'eu-central-1', AWS_S3_PRIVATE_BUCKET: '' }),
      );
      await expect(
        svc.getNeedsPresignedPost('photo', 'image/png'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getNeedsFileUrl', () => {
    it('returns a presigned GET url for a private key', async () => {
      const svc = withPrivateBucket();
      await expect(
        svc.getNeedsFileUrl('media/needs/recovery/doc/act.pdf'),
      ).resolves.toBe('https://signed.example/get');
      expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
    });

    it('throws when the private bucket is not configured', async () => {
      const svc = new UploadService(
        makeConfig({ AWS_REGION: 'eu-central-1', AWS_S3_PRIVATE_BUCKET: '' }),
      );
      await expect(svc.getNeedsFileUrl('k')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
