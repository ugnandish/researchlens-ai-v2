from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
app=FastAPI(title='ResearchLens ML')
# Baseline model for local demo. Replace with trained historical data using /train.
model=make_pipeline(StandardScaler(),LogisticRegression(max_iter=2000))
X=np.array([[2,1,3,80,75,45],[10,5,25,88,91,50],[1,0,2,55,48,75],[7,3,18,78,82,52],[3,1,6,62,66,65],[12,6,30,92,89,47]],float); y=np.array([0,1,0,1,0,1]); model.fit(X,y)
class Features(BaseModel):
    pi_experience:float=5; previous_grants:float=2; publications:float=10; methodology_score:float=75; novelty_score:float=75; budget_percentile:float=50
@app.post('/predict')
def predict(f:Features):
    x=np.array([[f.pi_experience,f.previous_grants,f.publications,f.methodology_score,f.novelty_score,f.budget_percentile]],float); p=float(model.predict_proba(x)[0,1]); return {'probability':p,'label':'higher-historical-likelihood' if p>=.5 else 'lower-historical-likelihood','features':x[0].tolist(),'note':'Demo model until trained on real institutional/funder outcomes.'}
class TrainRow(BaseModel):
    pi_experience:float; previous_grants:float; publications:float; methodology_score:float; novelty_score:float; budget_percentile:float; outcome:int
@app.post('/train')
def train(rows:list[TrainRow]):
    global model
    if len(rows)<20:return {'error':'Provide at least 20 historical rows for a development model.'}
    X=np.array([[r.pi_experience,r.previous_grants,r.publications,r.methodology_score,r.novelty_score,r.budget_percentile] for r in rows]); y=np.array([r.outcome for r in rows]); model.fit(X,y); return {'status':'trained','rows':len(rows)}
@app.get('/health')
def health(): return {'status':'ok'}
