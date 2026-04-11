from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

app = FastAPI(title="Study Tracker Analytics Microservice")

# Pydantic models for incoming data
class PauseItem(BaseModel):
    startedAt: str
    endedAt: Optional[str] = None
    reason: Optional[str] = None

class StudySession(BaseModel):
    id: str
    userId: str
    date: str
    startedAt: str
    endedAt: Optional[str] = None
    status: str
    pauseCount: int = 0
    pauses: List[PauseItem] = []
    focusedMinutes: float = 0
    inactiveSeconds: float = 0
    subject: str = "General"
    studyMode: str = "custom"
    plannedDurationMinutes: float = 0

class AnalyticsRequest(BaseModel):
    sessions: List[StudySession]

def create_base64_plot(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches='tight', transparent=True)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_base64

@app.post("/analyze")
def analyze_sessions(payload: AnalyticsRequest):
    sessions = payload.sessions
    if not sessions:
        return {
            "average_study_time": 0,
            "consistency_score": 0,
            "best_study_time": "Not enough data",
            "focus_score": 0,
            "weak_pattern": "Keep studying to unlock weak pattern detection!",
            "message": "We need more study sessions to generate valid analytics.",
            "graphs": {}
        }

    # Convert to pandas DataFrame
    df = pd.DataFrame([s.dict() for s in sessions])
    
    # Filter only completed sessions for reliable stats
    df = df[df['status'] == 'completed']
    if df.empty:
         return {
            "average_study_time": 0,
            "consistency_score": 0,
            "best_study_time": "Not enough data",
            "focus_score": 0,
            "weak_pattern": "Keep studying to unlock weak pattern detection!",
            "message": "Complete some sessions to see insights.",
            "graphs": {}
        }

    # Parse dates
    df['startedAt'] = pd.to_datetime(df['startedAt'])
    if 'endedAt' in df.columns:
        df['endedAt'] = pd.to_datetime(df['endedAt'])

    # Total duration calculation (custom since we need exact time excluding inactive)
    # Using startedAt and endedAt if available, else roughly use focusedMinutes
    def calculate_total_time(row):
        if pd.notna(row['endedAt']):
            return (row['endedAt'] - row['startedAt']).total_seconds() / 60
        return row['focusedMinutes'] + (row['inactiveSeconds'] / 60)
        
    df['total_duration_minutes'] = df.apply(calculate_total_time, axis=1)

    # 1. Study Analytics Engine calculations
    # Average study time
    avg_duration = df['total_duration_minutes'].mean()
    average_study_time = int(avg_duration) if pd.notna(avg_duration) else 0
    
    # Consistency %: Number of unique days studied over the span
    total_days_span = max((df['startedAt'].dt.date.max() - df['startedAt'].dt.date.min()).days + 1, 1)
    unique_study_days = df['date'].nunique()
    consistency_score = int((unique_study_days / total_days_span) * 100)
    consistency_score = min(consistency_score, 100)
    
    # Best study time (time of day)
    df['hour'] = df['startedAt'].dt.hour
    time_of_day_bins = [0, 6, 12, 18, 24]
    labels = ['Night (12am-6am)', 'Morning (6am-12pm)', 'Afternoon (12pm-6pm)', 'Evening (6pm-12am)']
    df['time_of_day'] = pd.cut(df['hour'], bins=time_of_day_bins, labels=labels, right=False)
    
    # Analyze productivity per time of day
    best_study_time_label = "Anytime"
    productivity_boost = 0
    try:
        grouped_tod = df.groupby('time_of_day', observed=False)['focusedMinutes'].mean().dropna()
        if not grouped_tod.empty:
            best_tod = grouped_tod.idxmax()
            best_avg = grouped_tod.max()
            overall_avg = df['focusedMinutes'].mean()
            if overall_avg > 0 and (best_avg - overall_avg) > 0:
                productivity_boost = int(((best_avg - overall_avg) / overall_avg) * 100)
                best_study_time_label = str(best_tod)
    except Exception as e:
        pass

    message = f"You are {productivity_boost}% more productive at {best_study_time_label.split(' ')[0]}" if productivity_boost > 0 else "You are consistently productive throughout the day!"

    # 2. Focus Score Algorithm
    total_focus_time = df['focusedMinutes'].sum()
    total_duration_time = df['total_duration_minutes'].sum()

    focus_score = 0
    if total_duration_time > 0:
        focus_score = int((total_focus_time / total_duration_time) * 100)
        focus_score = min(focus_score, 100)

    # 3. Weak Pattern Detection
    df['weekday'] = df['startedAt'].dt.day_name()
    weak_pattern_text = "No obvious weak patterns detected yet!"
    
    grouped_days = df.groupby('weekday')['focusedMinutes'].sum()
    if not grouped_days.empty and len(grouped_days) > 1:
        worst_day = grouped_days.idxmin()
        weak_pattern_text = f"You fail mostly on {worst_day}s"

    # 4. ML Predictions
    ml_insights = {}
    if len(df) > 5:
        try:
            from sklearn.ensemble import RandomForestRegressor
            from sklearn.preprocessing import LabelEncoder
            import datetime

            le_day = LabelEncoder()
            df['day_encoded'] = le_day.fit_transform(df['weekday'])
            
            X = df[['day_encoded', 'hour']]
            y = df['focusedMinutes']
            
            rf = RandomForestRegressor(n_estimators=50, random_state=42)
            rf.fit(X, y)
            
            now = datetime.datetime.now()
            current_day_str = now.strftime('%A')
            current_hour = now.hour
            
            if current_day_str in le_day.classes_:
                current_day_encoded = le_day.transform([current_day_str])[0]
                # Scikit-learn 1.2+ warns on un-named features, but it's fine for simple use
                predicted_minutes = rf.predict([[current_day_encoded, current_hour]])[0]
                ml_insights["prediction_text"] = f"Based on your habits, if you start studying now, our ML model predicts you will focus for ~{int(predicted_minutes)} minutes."
            else:
                ml_insights["prediction_text"] = "Not enough varied day data to predict right now."
        except Exception as e:
            ml_insights["prediction_text"] = "Gathering more data for AI predictions..."
    else:
        ml_insights["prediction_text"] = "Need more than 5 sessions to unlock AI predictions."

    # 5. Graph Analysis
    graphs = {}

    sns.set_theme(style="darkgrid")
    sns.set_palette("husl")

    # Graph 1: Studying history over days
    df_date_agg = df.groupby('date')['focusedMinutes'].sum().reset_index()
    if not df_date_agg.empty:
        fig1, ax1 = plt.subplots(figsize=(8, 4))
        sns.lineplot(data=df_date_agg, x='date', y='focusedMinutes', ax=ax1, marker='o', linewidth=2, color="#7B61FF")
        ax1.set_title('Study Focus Time Over Time', color='white')
        ax1.set_xlabel('Date', color='white')
        ax1.set_ylabel('Focused Minutes', color='white')
        ax1.tick_params(colors='white')
        ax1.xaxis.set_major_locator(plt.MaxNLocator(5))
        fig1.patch.set_facecolor('none')
        ax1.set_facecolor('none')
        graphs['focus_trend'] = create_base64_plot(fig1)

    # Graph 2: Weekday performance comparison
    if not grouped_days.empty:
        fig2, ax2 = plt.subplots(figsize=(8, 4))
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        grouped_days_sorted = grouped_days.reindex(day_order).fillna(0).reset_index()
        sns.barplot(data=grouped_days_sorted, x='weekday', y='focusedMinutes', ax=ax2, palette='magma')
        ax2.set_title('Focus Time by Day of Week', color='white')
        ax2.set_xlabel('Day', color='white')
        ax2.set_ylabel('Total Focus (mins)', color='white')
        ax2.tick_params(colors='white', rotation=45)
        fig2.patch.set_facecolor('none')
        ax2.set_facecolor('none')
        graphs['weekday_performance'] = create_base64_plot(fig2)

    return {
        "average_study_time": average_study_time,
        "consistency_score": consistency_score,
        "best_study_time": best_study_time_label,
        "focus_score": focus_score,
        "weak_pattern": weak_pattern_text,
        "message": message,
        "ml_insights": ml_insights,
        "graphs": graphs
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
