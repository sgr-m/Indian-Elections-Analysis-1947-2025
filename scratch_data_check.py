import pandas as pd
import json

df = pd.read_csv("data/interim/features_dataset.csv")

states = df['state_canonical'].dropna().unique().tolist()
states_raw = df['state_raw'].dropna().unique().tolist()

parties = df['party'].value_counts()
major_parties = parties[parties > 50].index.tolist() # threshold for "necessary" parties

with open("scratch/data_quality_check.json", "w") as f:
    json.dump({
        "states_canonical": states,
        "states_raw": states_raw,
        "party_count": len(parties),
        "major_parties_count": len(major_parties),
        "top_20_parties": major_parties[:20]
    }, f, indent=4)
