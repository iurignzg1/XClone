// Eventos anunciados quando alguém começa ou deixa de seguir outra pessoa.
export const USER_FOLLOWED = 'follow.added';
export const USER_UNFOLLOWED = 'follow.removed';

export interface FollowEvent {
  followerId: string;
  followedId: string;
}
