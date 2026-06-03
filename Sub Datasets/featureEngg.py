import pandas as pd
import numpy as np
from math import log2

def swing_e51_19(e51_19: pd.DataFrame) -> pd.DataFrame:
    """
    Party-level vote share lags and swing using e51_19.
    Uses: state_canonical, constitution, party, election_year_clean, vote_share_pct
    """
    df = (e51_19
          .rename(columns={'constitution': 'constituency'})
          .groupby(['state_canonical', 'constituency', 'party', 'election_year_clean'],
                   as_index=False)['vote_share_pct']
          .mean())

    df = df.sort_values(['state_canonical', 'constituency', 'party', 'election_year_clean'])

    df['vote_share_lag1'] = df.groupby(
        ['state_canonical', 'constituency', 'party']
    )['vote_share_pct'].shift(1)

    df['vote_share_lag2'] = df.groupby(
        ['state_canonical', 'constituency', 'party']
    )['vote_share_pct'].shift(2)

    df['vote_swing'] = df['vote_share_pct'] - df['vote_share_lag1']
    return df


def incumbency_e51_19(e51_19: pd.DataFrame) -> pd.DataFrame:
    """
    Add incumbency based on previous winner in each constituency.
    Uses: state_canonical, constitution, election_year_clean, party, rank
    """
    df = e51_19.copy().rename(columns={'constitution': 'constituency',
                                       'rank': 'rank_clean'})

    winners = (df.loc[df['rank_clean'] == 1,
                      ['state_canonical', 'constituency', 'election_year_clean', 'party']]
                 .rename(columns={'party': 'winner_party'}))

    winners_next = winners.copy()
    winners_next['election_year_clean'] = winners_next['election_year_clean'] + 1

    df = df.merge(
        winners_next,
        on=['state_canonical', 'constituency', 'election_year_clean'],
        how='left'
    )

    df['is_incumbent'] = (df['party'] == df['winner_party']).astype(int)
    return df


def enp_e51_19(e51_19: pd.DataFrame) -> pd.DataFrame:
    """
    Effective Number of Parties per constituency/year in e51_19.
    """
    df = e51_19.rename(columns={'constitution': 'constituency'})

    def enp_from_shares(vs_pct):
        vs = (vs_pct / 100.0).dropna()
        vs = vs[vs > 0]
        if len(vs) == 0:
            return np.nan
        return 1.0 / np.sum(vs**2)

    out = (df.groupby(['state_canonical', 'constituency', 'election_year_clean'])
           ['vote_share_pct']
           .apply(enp_from_shares)
           .reset_index(name='enp'))
    return out


def volatility_e51_19(e51_19: pd.DataFrame) -> pd.DataFrame:
    """
    Pedersen volatility per constituency/year for e51_19 using swing_e51_19().
    """
    swing_df = swing_e51_19(e51_19).copy()
    swing_df = swing_df.dropna(subset=['vote_share_lag1'])
    swing_df['abs_change'] = (swing_df['vote_share_pct'] - swing_df['vote_share_lag1']).abs()

    out = (swing_df.groupby(['state_canonical', 'constituency', 'election_year_clean'],
                            as_index=False)['abs_change']
           .sum()
           .rename(columns={'abs_change': 'sum_abs_change'}))

    out['volatility_pedersen'] = 0.5 * out['sum_abs_change']
    return out[['state_canonical', 'constituency', 'election_year_clean', 'volatility_pedersen']]


def pdi_e51_19(e51_19: pd.DataFrame) -> pd.DataFrame:
    """
    PDI per constituency/year in e51_19.
    """
    df = e51_19.rename(columns={'constitution': 'constituency'})

    def entropy_and_pdi(vs_pct):
        vs = (vs_pct / 100.0).dropna()
        vs = vs[vs > 0]
        n = len(vs)
        if n == 0:
            return pd.Series({'entropy': np.nan, 'n_parties': 0, 'pdi': np.nan})
        H = -np.sum(vs * np.log2(vs))
        pdi = 1 - H / log2(n) if n > 1 else 1.0
        return pd.Series({'entropy': H, 'n_parties': n, 'pdi': pdi})

    out = (df.groupby(['state_canonical', 'constituency', 'election_year_clean'])
           ['vote_share_pct']
           .apply(entropy_and_pdi)
           .reset_index())
    return out

def summary_e2024(e2024: pd.DataFrame) -> pd.DataFrame:
    """
    Party-level vote share per constituency in 2024.
    Uses existing columns, no renaming:
      state_canonical, PC Name, Party, election_year_clean, vote_share_pct
    """
    df = e2024.copy()

    # Clean strings just in case
    df['state_canonical'] = df['state_canonical'].astype(str).str.strip()
    df['PC Name'] = df['PC Name'].astype(str).str.strip()
    df['Party'] = df['Party'].astype(str).str.strip()

    out = (
        df.groupby(
            ['state_canonical', 'PC Name', 'Party', 'election_year_clean'],
            as_index=False
        )['vote_share_pct']
        .mean()
        .rename(columns={
            'PC Name': 'constituency',
            'Party': 'party'
        })
    )

    return out

def swing_parl(parl_51_14: pd.DataFrame) -> pd.DataFrame:
    df = (parl_51_14
          .groupby(['state_canonical', 'constituency', 'party', 'election_year_clean'],
                   as_index=False)['vote_share_pct']
          .mean())

    df = df.sort_values(['state_canonical', 'constituency', 'party', 'election_year_clean'])

    df['vote_share_lag1'] = df.groupby(
        ['state_canonical', 'constituency', 'party']
    )['vote_share_pct'].shift(1)

    df['vote_share_lag2'] = df.groupby(
        ['state_canonical', 'constituency', 'party']
    )['vote_share_pct'].shift(2)

    df['vote_swing'] = df['vote_share_pct'] - df['vote_share_lag1']
    return df

def build_coalition_mapping(party_master: pd.DataFrame) -> dict:
    """
    Build mapping party_canonical -> coalition.
    Edit NDA/INDIA lists as needed.
    """
    coalition = {}
    pm = party_master.copy()
    pm['key'] = pm['party_canonical'].fillna(pm['party_abbr_clean'])

    for k in pm['key'].dropna().unique():
        coalition[k] = 'Other'

    nda = ['BJP', 'JD(U)', 'SHS', 'SAD']
    india = ['INC', 'DMK', 'SP', 'CPM', 'CPI', 'RJD', 'JMM']

    for p in nda:
        coalition[p] = 'NDA'
    for p in india:
        coalition[p] = 'INDIA'

    return coalition


def coalition_strength(panel_like: pd.DataFrame,
                       party_master: pd.DataFrame,
                       party_col: str = 'party') -> pd.DataFrame:
    """
    Compute coalition-level vote share for any panel-like df with:
      state_canonical, constituency, election_year_clean, party_col, vote_share_pct
    """
    coalition_map = build_coalition_mapping(party_master)

    df = panel_like.copy()
    df['party_key'] = df[party_col].astype(str).str.strip()
    df['coalition'] = df['party_key'].map(coalition_map).fillna('Other')

    out = (df.groupby(['state_canonical', 'constituency', 'election_year_clean', 'coalition'],
                      as_index=False)['vote_share_pct']
           .sum()
           .rename(columns={'vote_share_pct': 'coalition_strength_pct'}))
    return out


