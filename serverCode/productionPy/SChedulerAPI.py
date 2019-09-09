from flask import Flask, request,jsonify
from library import scheduler
app = Flask(__name__)



@app.route('/', methods=['POST'])
def post():
	if request.method =='POST':
		courseList = request.json['course']
		constraint = request.json['constraint']
	try:
		scheduleList = engine.get_schedules(courseList,scorer,constraint)
		return jsonify({'schedules':scheduleList, 'success':1})
	except:
		return jsonify({'schedules':[], 'success':0})

if __name__ == '__main__':
	scorer = scheduler.fixedScoreGenerator('.')
	engine = scheduler.greedySearch()
	app.run(debug=False)