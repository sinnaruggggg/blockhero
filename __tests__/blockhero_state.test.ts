import {
  createInitialState,
  getCurrentInventoryCap,
  getCurrentShopOffers,
} from '../blockhero_state';

describe('blockhero_state helpers', () => {
  it('uses the base inventory cap when rogue hidden pocket is not unlocked', () => {
    const state = createInitialState();

    expect(getCurrentInventoryCap(state)).toBe(2);
  });

  it('increases inventory cap and applies shop discounts for rogue utility skills', () => {
    const state = createInitialState();
    state.player.selectedClassId = 'rogue';
    state.player.characters.rogue.skills = [
      {skillId: 'rogue_hidden_pocket', level: 1},
      {skillId: 'rogue_cunning_eye', level: 1},
    ];

    const offers = getCurrentShopOffers(state);

    expect(getCurrentInventoryCap(state)).toBe(3);
    expect(offers.find(offer => offer.itemId === 'hammer')?.goldPrice).toBe(680);
    expect(offers.find(offer => offer.itemId === 'refresh')?.goldPrice).toBe(700);
    expect(offers.find(offer => offer.itemId === 'refresh')?.diamondPrice).toBe(4);
  });
});
