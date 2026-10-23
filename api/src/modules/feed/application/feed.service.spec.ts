import { FollowsService } from '../../follows/application/follows.service.js';
import { TweetsService } from '../../tweets/application/tweets.service.js';
import type { Tweet } from '../../tweets/domain/tweet.entity.js';
import { FeedService } from './feed.service.js';

describe('FeedService', () => {
  const tweet = { id: 't1' } as Tweet;
  let calls: { authorIds: string[]; limit: number }[];

  function build(followingIds: string[]): FeedService {
    calls = [];
    const follows = {
      getFollowingIds: () => Promise.resolve(followingIds),
    } as unknown as FollowsService;
    const tweets = {
      findByAuthors: (authorIds: string[], limit: number) => {
        calls.push({ authorIds, limit });
        return Promise.resolve([tweet]);
      },
    } as unknown as TweetsService;
    return new FeedService(follows, tweets);
  }

  it('busca os tweets do próprio usuário e de quem ele segue', async () => {
    const service = build(['u2', 'u3']);

    const result = await service.getFeed('u1', 20);

    expect(calls).toEqual([{ authorIds: ['u1', 'u2', 'u3'], limit: 20 }]);
    expect(result).toEqual([tweet]);
  });

  it('sem seguir ninguém, o feed tem só os próprios tweets', async () => {
    const service = build([]);

    await service.getFeed('u1', 5);

    expect(calls).toEqual([{ authorIds: ['u1'], limit: 5 }]);
  });
});
