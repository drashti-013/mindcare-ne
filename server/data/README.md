# Cognitive dataset

`cognitive_dataset.csv` contains 600 **synthetic** records created for the competition prototype. It is not a clinical dataset and must not be presented as real patient data.

Features include age, memory, attention, orientation, language, reaction time, game accuracy, sleep hours, medication adherence and a synthetic support-priority label.

The Node.js backend trains a lightweight logistic-regression model from this CSV at startup. The model is used only to demonstrate an explainable AI/ML workflow. For real deployment, replace it with a validated, consented, clinically appropriate dataset and obtain the required approvals.
