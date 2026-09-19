import os
import json
import pandas as pd
import numpy as np

def main():
    root_dir = r"c:\Users\sagar\OneDrive\Desktop\Research Papers\Github Repos\Indian-Elections-Analysis-1947-2025"
    data_dir = os.path.join(root_dir, "data", "interim")
    out_dir = os.path.join(root_dir, "dashboard", "client", "public", "data")
    
    os.makedirs(out_dir, exist_ok=True)
    
    print("Loading Data...")
    df_features = pd.read_csv(os.path.join(data_dir, "features_dataset.csv"))
    df_2024 = pd.read_csv(os.path.join(data_dir, "clean_election_results_2024.csv"))
    df_ls = pd.read_csv(os.path.join(data_dir, "clean_loksabha_1962_2019.csv"))
    
    print("Cleaning and Merging Data...")
    # Prepare Fact Table
    cols_to_keep = [
        'id', 'election_year_clean', 'state_canonical', 'constitution', 'candidate', 
        'party', 'votes_received', 'vote_share_pct', 'rank', 'is_winner',
        'is_incumbent', 'alliance', 'fragmentation_index'
    ]
    df_results = df_features[[c for c in cols_to_keep if c in df_features.columns]].copy()
    
    df_2024_mapped = pd.DataFrame({
        'id': df_results['id'].max() + df_2024['_id'],
        'election_year_clean': df_2024['election_year_clean'],
        'state_canonical': df_2024['state_canonical'],
        'constitution': df_2024['PC Name'],
        'candidate': df_2024['Candidate'],
        'party': df_2024['Party'],
        'votes_received': df_2024['Total Votes'],
        'vote_share_pct': df_2024['vote_share_pct'],
        'rank': df_2024['rank_clean'],
        'is_winner': (df_2024['rank_clean'] == 1).astype(int),
        'is_incumbent': np.nan,
        'alliance': np.nan,
        'fragmentation_index': np.nan
    })
    
    fact_results = pd.concat([df_results, df_2024_mapped], ignore_index=True)
    fact_results.rename(columns={'party': 'party_abbr_clean'}, inplace=True)
    
    # --- DATA QUALITY FIX: Remove Underscores from State Names ---
    fact_results['state_canonical'] = fact_results['state_canonical'].astype(str).str.replace('_', ' ').str.title()
    df_ls['state_canonical'] = df_ls['state_canonical'].astype(str).str.replace('_', ' ').str.title()
    
    # --- DATA QUALITY FIX: Map 1992 to 1991 ---
    fact_results.loc[fact_results['election_year_clean'] == 1992, 'election_year_clean'] = 1991
    df_ls.loc[df_ls['election_year_clean'] == 1992, 'election_year_clean'] = 1991
    
    # Replace inf/nan with None for valid JSON serialization
    fact_results.replace([np.inf, -np.inf, np.nan], None, inplace=True)
    df_ls.replace([np.inf, -np.inf, np.nan], None, inplace=True)
    
    # 1. KPIs
    print("Generating KPIs...")
    kpis = {
        "metrics": {
            "total_elections": int(fact_results['election_year_clean'].nunique()),
            "total_parties": int(fact_results['party_abbr_clean'].nunique()),
            "total_const": int(fact_results['constitution'].nunique()),
            "avg_turnout": float(df_ls['Turnout'].mean()) if 'Turnout' in df_ls else None
        },
        "turnout_trend": df_ls.groupby('year')['Turnout'].mean().reset_index().rename(columns={'year':'election_year_clean', 'Turnout':'avg_turnout'}).to_dict(orient='records') if 'Turnout' in df_ls else [],
        "votes_trend": fact_results.groupby('election_year_clean')['votes_received'].sum().reset_index().rename(columns={'votes_received':'total_votes'}).to_dict(orient='records')
    }
    with open(os.path.join(out_dir, "kpis.json"), "w") as f:
        json.dump(kpis, f)
        
    # 2. States List and State Details
    print("Generating State Data...")
    states = sorted([s for s in fact_results['state_canonical'].unique() if s and s != 'Nan' and s != 'None'])
    states.insert(0, "All States (National)")
    
    with open(os.path.join(out_dir, "states_list.json"), "w") as f:
        json.dump(states, f)
        
    state_details = {}
    
    # Calculate All States (National)
    max_share_nat = fact_results['vote_share_pct'].max()
    dom_party_nat = fact_results[fact_results['is_winner'] == 1]['party_abbr_clean'].value_counts().index[0]
    
    top_parties_nat = fact_results[fact_results['is_winner'] == 1]['party_abbr_clean'].value_counts().nlargest(10).index
    seats_dist_nat = fact_results[fact_results['is_winner'] == 1].groupby(['election_year_clean', 'party_abbr_clean']).size().reset_index(name='seats_won')
    seats_dist_nat['party_abbr_clean'] = seats_dist_nat['party_abbr_clean'].apply(lambda x: x if x in top_parties_nat else 'Others')
    seats_dist_nat = seats_dist_nat.groupby(['election_year_clean', 'party_abbr_clean'])['seats_won'].sum().reset_index()
    
    state_details["All States (National)"] = {
        "metrics": {
            "seats": int(fact_results['constitution'].nunique()),
            "max_share": float(max_share_nat) if max_share_nat else None
        },
        "dominant_party": {"party_abbr_clean": dom_party_nat},
        "seats_distribution": seats_dist_nat.to_dict(orient='records')
    }
    
    for state in states[1:]:
        df_state = fact_results[fact_results['state_canonical'] == state]

        
        # Max vote share safely
        max_share = df_state['vote_share_pct'].max()
        if pd.isna(max_share): max_share = None
        
        dom_party_series = df_state[df_state['is_winner'] == 1]['party_abbr_clean'].value_counts()
        dom_party = dom_party_series.index[0] if not dom_party_series.empty else "N/A"
        
        seats_dist = df_state[df_state['is_winner'] == 1].groupby(['election_year_clean', 'party_abbr_clean']).size().reset_index(name='seats_won')
        # Keep top 10 parties over time, bundle rest as 'Others'
        top_parties = df_state[df_state['is_winner'] == 1]['party_abbr_clean'].value_counts().nlargest(10).index
        seats_dist['party_abbr_clean'] = seats_dist['party_abbr_clean'].apply(lambda x: x if x in top_parties else 'Others')
        seats_dist = seats_dist.groupby(['election_year_clean', 'party_abbr_clean'])['seats_won'].sum().reset_index()
        
        state_details[state] = {
            "metrics": {
                "seats": int(df_state['constitution'].nunique()),
                "max_share": float(max_share) if max_share else None
            },
            "dominant_party": {"party_abbr_clean": dom_party},
            "seats_distribution": seats_dist.to_dict(orient='records')
        }
        
    with open(os.path.join(out_dir, "state_details.json"), "w") as f:
        json.dump(state_details, f)
        
    # 3. Parties List and Details
    print("Generating Party Data...")
    # Get parties with > 50 contested seats historically (as requested for filter optimization)
    party_counts = fact_results['party_abbr_clean'].value_counts()
    major_parties = party_counts[party_counts > 50].index.tolist()
    
    # We also need active years for each major party to implement the Year Range filter
    party_meta = []
    party_details = {}
    
    for party in major_parties:
        df_party = fact_results[fact_results['party_abbr_clean'] == party]
        active_years = sorted(df_party['election_year_clean'].unique().tolist())
        party_meta.append({
            "party_abbr_clean": party,
            "active_years": [int(y) for y in active_years]
        })
        
        total_wins = int(df_party['is_winner'].sum())
        total_contested = len(df_party)
        avg_share = float(df_party['vote_share_pct'].mean()) if not df_party['vote_share_pct'].isna().all() else None
        
        trajectory = df_party.groupby('election_year_clean')['is_winner'].sum().reset_index(name='seats')
        
        # for box plot spread
        spread = df_party.dropna(subset=['vote_share_pct'])[['election_year_clean', 'vote_share_pct']]
        
        party_details[party] = {
            "metrics": {
                "total_wins": total_wins,
                "total_contested": total_contested,
                "avg_share": avg_share
            },
            "trajectory": trajectory.to_dict(orient='records'),
            "spread": spread.to_dict(orient='records')
        }
        
    with open(os.path.join(out_dir, "parties_list.json"), "w") as f:
        json.dump(party_meta, f)
        
    with open(os.path.join(out_dir, "party_details.json"), "w") as f:
        json.dump(party_details, f)
        
    # 4. Coalition Insights
    print("Generating Coalition Data...")
    df_alli = fact_results.dropna(subset=['alliance'])
    alliances = df_alli.groupby('alliance').agg(contested=('id', 'count'), wins=('is_winner', 'sum')).reset_index()
    
    df_inc = fact_results.dropna(subset=['is_incumbent'])
    incumbency = df_inc.groupby('is_incumbent').agg(total=('id', 'count'), wins=('is_winner', 'sum')).reset_index()
    
    df_frag = fact_results.dropna(subset=['fragmentation_index'])
    fragmentation = df_frag.groupby('election_year_clean')['fragmentation_index'].mean().reset_index(name='avg_frag')
    
    coalitions = {
        "alliances": alliances.to_dict(orient='records'),
        "incumbency": incumbency.to_dict(orient='records'),
        "fragmentation": fragmentation.to_dict(orient='records')
    }
    
    with open(os.path.join(out_dir, "coalitions.json"), "w") as f:
        json.dump(coalitions, f)

    print(f"JSON Build Complete! Files saved to {out_dir}")

if __name__ == "__main__":
    main()
