import os
import subprocess
import sys
from tqdm import tqdm

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    notebooks_dir = os.path.join(root_dir, "notebooks")
    
    # List of notebooks to run sequentially
    notebooks_to_run = [
        "01_data_collection.ipynb",
        "02_data_cleanup_and_filteration.ipynb",
        "03_feature_engineering.ipynb",
        "04_eda.ipynb",
        "05_indices.ipynb",
        "06_statistical_models.ipynb",
        "07_machine_learning_models.ipynb",
        "08_network_analysis_of_colation.ipynb"
    ]
    
    print("Starting Data Pipeline Execution...")
    print(f"Total Notebooks to execute: {len(notebooks_to_run)}")
    print("-" * 50)
    
    # We use tqdm for the progress bar
    pbar = tqdm(notebooks_to_run, desc="Pipeline Progress", ncols=100, bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]')
    
    for idx, nb_name in enumerate(pbar, 1):
        nb_path = os.path.join(notebooks_dir, nb_name)
        if not os.path.exists(nb_path):
            tqdm.write(f"Error: Could not find notebook {nb_name} in {notebooks_dir}")
            sys.exit(1)
            
        tqdm.write(f"[{idx}/{len(notebooks_to_run)}] Executing {nb_name} ...")
        try:
            # We run nbconvert with the CWD set to notebooks_dir so that relative paths work perfectly
            result = subprocess.run(
                [
                    sys.executable, "-m", "jupyter", "nbconvert", 
                    "--to", "notebook", 
                    "--execute", 
                    "--inplace", 
                    nb_name
                ],
                cwd=notebooks_dir,
                check=True,
                capture_output=True,
                text=True
            )
            tqdm.write(f"Successfully finished {nb_name}\n")
        except subprocess.CalledProcessError as e:
            tqdm.write(f"Error executing {nb_name}!")
            tqdm.write("STDOUT: " + e.stdout)
            tqdm.write("STDERR: " + e.stderr)
            sys.exit(1)

    print("-" * 50)
    print("Pipeline Execution Complete!")
    print("All charts have been exported to reports/charts/ and outputs saved in notebooks.")
    
    print("-" * 50)
    print("Building Static JSON files for React Dashboard...")
    try:
        subprocess.run(
            ["uv", "run", "--with", "pandas", "--with", "numpy", os.path.join(root_dir, "src", "data", "build_json.py")],
            cwd=root_dir,
            check=True
        )
        print("Static JSON files built successfully in dashboard/client/public/data!")
    except subprocess.CalledProcessError:
        print("Error building JSON files.")
        sys.exit(1)
    except FileNotFoundError:
        print("Error: 'uv' is not installed or not in PATH. Please install uv or run build_json.py manually.")
        sys.exit(1)

if __name__ == "__main__":
    main()
