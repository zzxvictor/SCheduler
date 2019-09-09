import requests, json
from library import scheduler
import time, numpy as np
import matplotlib.pyplot as plt 
with open ('mock.json', 'r') as handle:
	mockData = json.load(handle)

payload = {'course':mockData, 'constraint':{'unit': 17, 'avoidTime':[()]}  }
average = []
'''
#test running speed
for i in range (30):
    measure = []
    for j in range (5):
        start = time.time()
        r = requests.post('http://127.0.0.1:5000', json=payload)
        schedules = r.json()['schedules']
        if len(schedules) <2:
            print ('fail!!!!!!')
        measure.append(time.time()-start)
    average.append(sum(measure)/len(measure))
bootstrap = []
for i in range (1000):
	bootstrap.append(sum(np.random.choice(average, len(average), replace =True))/len(average))
plt.hist(bootstrap, bins = 10)
'''
# visualize returned schedule
r = requests.post('http://127.0.0.1:5000', json=payload)
schedules = r.json()['schedules']
for i in range (3):
    painter = scheduler.printSchedule()
    painter.show_schedule(schedules[i][0])