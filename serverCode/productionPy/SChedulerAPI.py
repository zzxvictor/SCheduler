from flask import Flask, request,jsonify
from library import scheduler
#from waitress import serve
app = Flask(__name__)


@app.route('/hello')
def hello():
    print ('Hello')
    return 'Hello'
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
    app.run(host='0.0.0.0',port = 80, ssl_context='adhoc')
    #context.load_cert_chain("server.crt", "server.key")
    #app.run (debug = True, ssl_context='adhoc')
    


