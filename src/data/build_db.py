import os
import pandas as pd
import sqlite3

def main():
    root_dir = r"c:\Users\sagar\OneDrive\Desktop\Research Papers\Github Repos\Indian-Elections-Analysis-1947-2025"
    data_dir = os.path.join(root_dir, "data", "interim")
    db_path = os.path.join(root_dir, "data", "processed", "elections.db")
    
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    print(f"Connecting to SQLite database at {db_path}...")
    conn = sqlite3.connect(db_path)
    
    # 1. Dim_Party
    print("Building Dim_Party...")
    df_party = pd.read_csv(os.path.join(data_dir, "clean_ref_party_master.csv"))
    # Select relevant columns for dimension
    dim_party = df_party[['party_abbr_clean', 'party_canonical', 'party_type_clean']].drop_duplicates()
    dim_party.to_sql("Dim_Party", conn, if_exists="replace", index=False)
    
    # 2. Dim_State
    print("Building Dim_State...")
    # Derive from party master or results
    dim_state = df_party[['state_canonical', 'state_raw']].drop_duplicates().dropna(subset=['state_canonical'])
    dim_state.to_sql("Dim_State", conn, if_exists="replace", index=False)
    
    # 3. Fact_Election_Results (combining features_dataset and 2024)
    print("Building Fact_Election_Results (1951-2019)...")
    df_features = pd.read_csv(os.path.join(data_dir, "features_dataset.csv"))
    
    # Rename for consistency
    cols_to_keep = [
        'id', 'election_year_clean', 'state_canonical', 'constitution', 'candidate', 
        'party', 'votes_received', 'vote_share_pct', 'rank', 'result', 'is_winner',
        'is_incumbent', 'vote_swing', 'fragmentation_index', 'alliance', 'coalition_strength_score'
    ]
    df_results = df_features[[c for c in cols_to_keep if c in df_features.columns]].copy()
    
    print("Appending 2024 Data...")
    df_2024 = pd.read_csv(os.path.join(data_dir, "clean_election_results_2024.csv"))
    
    # Map 2024 columns
    df_2024_mapped = pd.DataFrame({
        'id': df_results['id'].max() + df_2024['_id'], # Ensure unique ID
        'election_year_clean': df_2024['election_year_clean'],
        'state_canonical': df_2024['state_canonical'],
        'constitution': df_2024['PC Name'],
        'candidate': df_2024['Candidate'],
        'party': df_2024['Party'],
        'votes_received': df_2024['Total Votes'],
        'vote_share_pct': df_2024['vote_share_pct'],
        'rank': df_2024['rank_clean'],
        'is_winner': (df_2024['rank_clean'] == 1).astype(int),
        'result': df_2024['rank_clean'].apply(lambda x: 'winner' if x == 1 else ('1st runner up' if x == 2 else 'loser'))
    })
    
    fact_results = pd.concat([df_results, df_2024_mapped], ignore_index=True)
    # Rename 'party' to match Dim_Party 'party_abbr_clean' for foreign key intuition
    fact_results.rename(columns={'party': 'party_abbr_clean'}, inplace=True)
    
    print("Writing Fact_Election_Results to SQLite...")
    fact_results.to_sql("Fact_Election_Results", conn, if_exists="replace", index=False)
    
    # 4. Fact_LokSabha_Summary
    print("Building Fact_LokSabha_Summary...")
    df_ls = pd.read_csv(os.path.join(data_dir, "clean_loksabha_1962_2019.csv"))
    df_ls.rename(columns={'Pc_name': 'constitution'}, inplace=True)
    # drop the 'year' column since we already have 'election_year_clean'
    if 'year' in df_ls.columns:
        df_ls.drop(columns=['year'], inplace=True)
    df_ls.to_sql("Fact_LokSabha_Summary", conn, if_exists="replace", index=False)
    
    # Create Indices for performance
    print("Creating Database Indices...")
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_fact_year ON Fact_Election_Results(election_year_clean);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_fact_state ON Fact_Election_Results(state_canonical);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_fact_party ON Fact_Election_Results(party_abbr_clean);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ls_year ON Fact_LokSabha_Summary(election_year_clean);")
    conn.commit()
    
    conn.close()
    print("Database built successfully!")

if __name__ == "__main__":
    main()
