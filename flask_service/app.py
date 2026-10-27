from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import joblib
import os
from utils import apply_early_warning_system, generate_recommendations

app = Flask(__name__)
CORS(app)

# Load Models
MODEL_PATH = 'model.joblib'
SCALER_PATH = 'scaler.joblib'

kmeans_model = None
scaler_model = None

if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
    try:
        kmeans_model = joblib.load(MODEL_PATH)
        scaler_model = joblib.load(SCALER_PATH)
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
else:
    print("⚠️ Model files not found. Please run train_model.py first.")

def analyze_data(df):
    # ==========================================
    # BAGIAN 1: LOAD & CLEANING DATA
    # ==========================================
    
    # Check if df is already a DataFrame (it should be)
    # The reading happens in the route now

    
    DATA_START_ROW = 5
    COL_NIS = 1
    COL_NAMA = 2
    COL_NILAI_START = 6
    COL_NILAI_END = 40
    COL_SAKIT = 40
    COL_IZIN = 41
    COL_ALPA = 42

    df_clean = pd.DataFrame()
    df_clean['nis'] = df.iloc[DATA_START_ROW:, COL_NIS]
    df_clean['nama_siswa'] = df.iloc[DATA_START_ROW:, COL_NAMA]

    df_clean['sakit'] = pd.to_numeric(df.iloc[DATA_START_ROW:, COL_SAKIT], errors='coerce').fillna(0)
    df_clean['izin'] = pd.to_numeric(df.iloc[DATA_START_ROW:, COL_IZIN], errors='coerce').fillna(0)
    df_clean['alpa'] = pd.to_numeric(df.iloc[DATA_START_ROW:, COL_ALPA], errors='coerce').fillna(0)

    nilai_raw = df.iloc[DATA_START_ROW:, COL_NILAI_START:COL_NILAI_END]
    nilai_raw = nilai_raw.apply(pd.to_numeric, errors='coerce')

    # Cleaning basic
    df_clean.reset_index(drop=True, inplace=True)
    nilai_raw.reset_index(drop=True, inplace=True) # Align indices
    
    df_clean = df_clean.dropna(subset=['nama_siswa'])
    df_clean = df_clean[df_clean['nama_siswa'].astype(str).str.strip() != '']
    
    # Filter valid rows in nilai_raw corresponding to df_clean
    nilai_raw = nilai_raw.loc[df_clean.index]
    
    # 2. Feature Engineering (Match Notebook/Utils)
    
    # Rata-rata
    df_clean['rata_rata_nilai'] = nilai_raw.mean(axis=1, skipna=True)
    
    # Periode Awal vs Akhir (Split columns)
    num_cols = nilai_raw.shape[1]
    mid = num_cols // 2
    
    val_awal = nilai_raw.iloc[:, :mid]
    val_akhir = nilai_raw.iloc[:, mid:]
    
    df_clean['rata_nilai_periode_awal'] = val_awal.mean(axis=1, skipna=True)
    df_clean['rata_nilai_periode_akhir'] = val_akhir.mean(axis=1, skipna=True)
    
    # Perubahan Nilai
    df_clean['perubahan_nilai'] = df_clean['rata_nilai_periode_akhir'] - df_clean['rata_nilai_periode_awal']
    
    # Volatilitas
    df_clean['volatilitas_nilai'] = nilai_raw.std(axis=1, skipna=True)
    
    # Flag Penurunan Tajam
    df_clean['persentase_perubahan'] = np.where(df_clean['rata_nilai_periode_awal'] > 0,
                                               (df_clean['perubahan_nilai'] / df_clean['rata_nilai_periode_awal']) * 100,
                                               0)
    df_clean['flag_penurunan_tajam'] = df_clean['persentase_perubahan'] < -15
    
    # Absensi
    df_clean['total_absensi'] = df_clean['sakit'] + df_clean['izin'] + df_clean['alpa']
    
    # Rasio Kehadiran (Assuming 120 days)
    TOTAL_HARI_EFEKTIF = 120
    df_clean['hari_hadir'] = TOTAL_HARI_EFEKTIF - df_clean['total_absensi']
    df_clean['rasio_kehadiran'] = (df_clean['hari_hadir'] / TOTAL_HARI_EFEKTIF) * 100

    # Fill NaNs for safety
    df_clean = df_clean.fillna(0)

    # 3. Apply ML Clustering
    if kmeans_model and scaler_model:
        clustering_features = [
            'total_absensi',
            'rata_rata_nilai',
            'perubahan_nilai',
            'volatilitas_nilai',
            'rasio_kehadiran'
        ]
        
        X = df_clean[clustering_features]
        X_scaled = scaler_model.transform(X)
        clusters = kmeans_model.predict(X_scaled)
        df_clean['cluster_id'] = clusters
        
        # Note: mapping cluster ID to 'risk label' (Berisiko Tinggi etc) depends on the *specific training run* 
        # (cluster 0 isn't always High Risk). 
        # In the notebook, it used dynamic stats to map.
        # Ideally, we should save the cluster mapping in train_model.py. 
        # For now, we will rely on our Rule-Based System for the main "Status Peringatan".
        # The ML cluster can be returned as an additional info "Group ID".
    else:
        df_clean['cluster_id'] = -1

    # 4. Apply Early Warning System (Rule Based - The "Teacher")
    df_clean = apply_early_warning_system(df_clean)
    
    # 5. Generate Recommendations
    df_clean['rekomendasi'] = df_clean.apply(generate_recommendations, axis=1)

    return df_clean

@app.route('/api/analyze_json', methods=['POST'])
def api_analyze_json():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        # Expecting a list of students
        if not isinstance(data, list):
            return jsonify({'error': 'Input must be a list of student objects'}), 400

        # Convert to DataFrame
        # Map JSON keys to expected DataFrame columns if necessary
        # Expected from JSON: nis, nama_siswa, sakit, izin, alpa, nilai (list)
        df = pd.DataFrame(data)
        
        # Validate required columns
        required_cols = ['nis', 'nama_siswa']
        for col in required_cols:
            if col not in df.columns:
                return jsonify({'error': f'Missing column: {col}'}), 400

        # Ensure 'nilai' is present, if not fill with empty lists
        if 'nilai' not in df.columns:
            df['nilai'] = [[] for _ in range(len(df))]

        # Ensure attendance columns exist
        for col in ['sakit', 'izin', 'alpa']:
            if col not in df.columns:
                df[col] = 0

        # Run Analysis
        # Note: analyze_data logic expects specific cleaning that might be redundant for clean JSON 
        # but we reuse it for consistency.
        # We need to adapt analyze_data slightly or pre-process df to match what analyze_data expects (which currently does a lot of parsing)
        
        # Actually, analyze_data currently does a lot of specific parsing (reading from ROW 5 etc) designed for the Excel file.
        # We should creates a SEPARATE helper or refactor analyze_data to separate "Parsing" from "Feature Engineering".
        
        # Let's call a new function `process_student_data` that takes a clean DataFrame
        # Refactoring approach:
        # 1. analyze_data (File) -> Parses File -> Clean DF -> process_student_data -> Result
        # 2. analyze_json (JSON) -> Clean DF -> process_student_data -> Result
        
        # Since I cannot easily refactor the whole file in one go safely without seeing it all again, 
        # I will implement the logic for JSON here directly using utils functions, which is cleaner.
        
        df_clean = df.copy()
        
        # Ensure numeric
        for col in ['sakit', 'izin', 'alpa']:
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce').fillna(0)
            
        # Calculate features using UTILS which handles the logic
        from utils import calculate_features, apply_early_warning_system, generate_recommendations
        
        # Calculate Features (Generic)
        df_clean = calculate_features(df_clean)
        
        # ML Clustering
        if kmeans_model and scaler_model:
            clustering_features = [
                'total_absensi',
                'rata_rata_nilai',
                'perubahan_nilai',
                'volatilitas_nilai',
                'rasio_kehadiran'
            ]
            # Ensure no NaNs
            X = df_clean[clustering_features].fillna(0)
            X_scaled = scaler_model.transform(X)
            clusters = kmeans_model.predict(X_scaled)
            df_clean['cluster_id'] = clusters
        else:
            df_clean['cluster_id'] = -1

        # Rule Based System
        df_clean = apply_early_warning_system(df_clean)
        
        # Recommendations
        df_clean['rekomendasi'] = df_clean.apply(generate_recommendations, axis=1)

        # Response
        hasil = {
            'metadata': {
                'total_siswa': int(len(df_clean)),
                'urgent': int(len(df_clean[df_clean['status_peringatan'] == '🚨 URGENT'])),
                'warning': int(len(df_clean[df_clean['status_peringatan'] == 'WARNING'])),
                'watch': int(len(df_clean[df_clean['status_peringatan'] == 'WATCH'])),
                'normal': int(len(df_clean[df_clean['status_peringatan'] == 'NORMAL']))
            },
            'data_siswa': df_clean[[
                'nis', 'nama_siswa', 'rata_rata_nilai', 'total_absensi',
                'sakit', 'izin', 'alpa', 'status_peringatan', 'risk_score', 
                'cluster_id', 'rekomendasi', 'perubahan_nilai'
            ]].to_dict('records')
        }
        
        return jsonify(hasil)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, port=port, host='0.0.0.0')
