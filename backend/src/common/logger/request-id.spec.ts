import { getCurrentInvoke } from '@codegenie/serverless-express';
import { resolveRequestId } from './request-id';

jest.mock('@codegenie/serverless-express', () => ({
  getCurrentInvoke: jest.fn(),
}));

const mockedGetCurrentInvoke = getCurrentInvoke as jest.MockedFunction<
  typeof getCurrentInvoke
>;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function invoke(requestId?: unknown, awsRequestId?: unknown) {
  mockedGetCurrentInvoke.mockReturnValue({
    event: requestId === undefined ? {} : { requestContext: { requestId } },
    context: awsRequestId === undefined ? {} : { awsRequestId },
  });
}

describe('resolveRequestId', () => {
  afterEach(() => jest.resetAllMocks());

  it('prefers the API Gateway request id', () => {
    invoke('apigw-abc123', 'lambda-xyz');
    expect(resolveRequestId()).toBe('apigw-abc123');
  });

  it('falls back to the Lambda invocation id', () => {
    invoke(undefined, 'lambda-xyz');
    expect(resolveRequestId()).toBe('lambda-xyz');
  });

  it('generates a UUID outside a Lambda invocation', () => {
    mockedGetCurrentInvoke.mockReturnValue({});
    expect(resolveRequestId()).toMatch(UUID_V4);
  });

  it('generates a fresh id on every call outside a Lambda invocation', () => {
    mockedGetCurrentInvoke.mockReturnValue({});
    expect(resolveRequestId()).not.toBe(resolveRequestId());
  });

  // A malformed event must not put a non-string, an empty string or an
  // unbounded blob into every log line of the request.
  it.each([
    ['a non-string', 42],
    ['an object', { nested: true }],
    ['null', null],
    ['an empty string', '   '],
  ])('ignores %s and falls through', (_label, value) => {
    invoke(value, 'lambda-xyz');
    expect(resolveRequestId()).toBe('lambda-xyz');
  });

  it('trims surrounding whitespace', () => {
    invoke('  apigw-abc123  ');
    expect(resolveRequestId()).toBe('apigw-abc123');
  });

  it('truncates an over-long id', () => {
    invoke('x'.repeat(500));
    expect(resolveRequestId()).toHaveLength(128);
  });
});
