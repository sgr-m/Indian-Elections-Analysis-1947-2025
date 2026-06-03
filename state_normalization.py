"""
state_normalization.py
─────────────────────────────────────────────────────────────────
Reusable module for state name normalization across all notebooks.
Place this file in the project root. Import in any notebook with:

    from state_normalization import normalize_state, STATE_NAME_MAP, get_state_code

Author: Sagar Maindola
Project: Electoral Democracy in India (1947–2025)
"""

import pandas as pd
import os

# ── Build lookup from state_name_variants.csv ─────────────────────────────
_THIS_DIR = os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else os.getcwd()
_VARIANTS_PATH = os.path.join(_THIS_DIR, 'ReferenceData', 'state_name_variants.csv')

def _build_maps():
    if not os.path.exists(_VARIANTS_PATH):
        raise FileNotFoundError(
            f"state_name_variants.csv not found at {_VARIANTS_PATH}\n"
            "Run 01_data_collection.ipynb first."
        )
    df = pd.read_csv(_VARIANTS_PATH)
    name_map = dict(zip(df['variant'], df['canonical_name']))
    code_map = dict(zip(df['variant'], df['state_code']))
    return name_map, code_map

STATE_NAME_MAP, STATE_CODE_MAP = _build_maps()


def normalize_state(raw_name: str, year: int = None) -> str:
    """
    Map a raw state name string to its canonical name.

    Parameters
    ----------
    raw_name : str   — The state name as it appears in source data.
    year     : int   — Election year (used for bifurcation-aware mapping).

    Returns
    -------
    str — Canonical state name, or raw_name if not found (to flag for review).

    Bifurcation rules (year-aware)
    ────────────────────────────────
    - UP  : Uttar Pradesh before 2000, Uttarakhand constituency logic after 2000
    - BR  : Bihar before 2000, Jharkhand constituency logic after 2000
    - MP  : Madhya Pradesh before 2000, Chhattisgarh logic after 2000
    - AP  : Andhra Pradesh before 2014, Telangana logic after 2014
    """
    if pd.isna(raw_name):
        return None

    raw_str = str(raw_name).strip()

    # 1. Direct lookup
    if raw_str in STATE_NAME_MAP:
        canonical = STATE_NAME_MAP[raw_str]
    else:
        # 2. Case-insensitive fallback
        lower_map = {k.lower(): v for k, v in STATE_NAME_MAP.items()}
        canonical = lower_map.get(raw_str.lower(), raw_str)

    # 3. Time-aware bifurcation note
    # (actual constituency-level reassignment done in 03_data_cleaning.ipynb)
    if year is not None:
        if canonical == "Uttar Pradesh" and year >= 2000:
            pass  # constituency mapping done at cleaning step
        if canonical == "Bihar" and year >= 2000:
            pass
        if canonical == "Madhya Pradesh" and year >= 2000:
            pass
        if canonical == "Andhra Pradesh" and year >= 2014:
            pass

    return canonical


def get_state_code(raw_name: str) -> str:
    """Return the two/three-letter state code for a raw state name."""
    if pd.isna(raw_name):
        return None
    raw_str = str(raw_name).strip()
    if raw_str in STATE_CODE_MAP:
        return STATE_CODE_MAP[raw_str]
    lower_map = {k.lower(): v for k, v in STATE_CODE_MAP.items()}
    return lower_map.get(raw_str.lower(), "UNK")


def apply_normalization(df: pd.DataFrame,
                        state_col: str,
                        year_col: str = None,
                        inplace: bool = False) -> pd.DataFrame:
    """
    Apply state normalization to a DataFrame.

    Adds two columns:
      - state_canonical  : normalized name
      - state_code       : standard state code

    Parameters
    ----------
    df         : input DataFrame
    state_col  : column containing raw state names
    year_col   : (optional) column containing election year for bifurcation logic
    inplace    : if True, modifies df in-place; else returns a copy
    """
    if not inplace:
        df = df.copy()

    if year_col and year_col in df.columns:
        df['state_canonical'] = df.apply(
            lambda r: normalize_state(r[state_col], int(r[year_col])
                       if pd.notna(r[year_col]) else None), axis=1
        )
    else:
        df['state_canonical'] = df[state_col].apply(normalize_state)

    df['state_code'] = df[state_col].apply(get_state_code)
    return df


# ── Bifurcation-aware constituency mapping (post-2000 splits) ─────────────
# Known Uttarakhand districts (for UP split mapping)
UTTARAKHAND_CONSTITUENCIES = {
    "ALMORA", "BAGESHWAR", "CHAMOLI", "CHAMPAWAT", "DEHRADUN",
    "GARHWAL", "HARIDWAR", "NAINITAL", "PAURI GARHWAL", "PITHORAGARH",
    "RUDRAPRAYAG", "TEHRI GARHWAL", "UDHAM SINGH NAGAR", "UTTARKASHI",
    "TEHRI", "PAURI", "HARDWAR", "KOTDWAR", "LANSDOWNE",
}

# Known Jharkhand constituencies (for Bihar split mapping)
JHARKHAND_CONSTITUENCIES = {
    "CHATRA", "DHANBAD", "DUMKA", "GIRIDIH", "GODDA", "HAZARIBAGH",
    "JAMSHEDPUR", "KHUNTI", "KODERMA", "LOHARDAGA", "PALAMU",
    "RAJMAHAL", "RANCHI", "SINGHBHUM",
}

# Known Chhattisgarh constituencies (for MP split mapping)  
CHHATTISGARH_CONSTITUENCIES = {
    "AMBIKAPUR", "BASTAR", "BILASPUR", "DURG", "JANJGIR-CHAMPA",
    "JASHPUR", "KANKER", "KORBA", "KORIYA", "MAHASAMUND",
    "RAIGARH", "RAIPUR", "RAJNANDGAON", "SURGUJA",
}

def resolve_bifurcated_state(row, state_col, constituency_col, year_col):
    """
    For post-2000 elections, reassign constituencies from parent states
    to successor states based on known constituency-state mappings.
    """
    canonical = normalize_state(row.get(state_col), row.get(year_col))
    year = row.get(year_col, 0)
    constituency = str(row.get(constituency_col, '')).upper().strip()

    if year and int(year) >= 2000:
        if canonical == "Uttar Pradesh" and constituency in UTTARAKHAND_CONSTITUENCIES:
            return "Uttarakhand"
        if canonical == "Bihar" and constituency in JHARKHAND_CONSTITUENCIES:
            return "Jharkhand"
        if canonical == "Madhya Pradesh" and constituency in CHHATTISGARH_CONSTITUENCIES:
            return "Chhattisgarh"

    if year and int(year) >= 2014:
        # Telangana split from AP — handled separately in 03_data_cleaning.ipynb
        pass

    return canonical
