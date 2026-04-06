import {
  getLatestFloatingDamageHit,
  pushFloatingDamageHit,
  removeFloatingDamageHit,
} from '../src/game/floatingDamage';

describe('floatingDamage', () => {
  it('keeps only the latest three hits', () => {
    let hits = pushFloatingDamageHit([], 1, 120);
    hits = pushFloatingDamageHit(hits, 2, 240);
    hits = pushFloatingDamageHit(hits, 3, 360);
    hits = pushFloatingDamageHit(hits, 4, 480);

    expect(hits).toEqual([
      {id: 2, damage: 240},
      {id: 3, damage: 360},
      {id: 4, damage: 480},
    ]);
  });

  it('removes a completed hit by id', () => {
    const hits = [
      {id: 10, damage: 100},
      {id: 11, damage: 200},
      {id: 12, damage: 300},
    ];

    expect(removeFloatingDamageHit(hits, 11)).toEqual([
      {id: 10, damage: 100},
      {id: 12, damage: 300},
    ]);
  });

  it('returns the newest hit', () => {
    expect(getLatestFloatingDamageHit([])).toBeNull();
    expect(
      getLatestFloatingDamageHit([
        {id: 1, damage: 80},
        {id: 2, damage: 160},
      ]),
    ).toEqual({id: 2, damage: 160});
  });
});
