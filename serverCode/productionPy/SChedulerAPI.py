from flask import Flask, request,jsonify
from library import scheduler
#from waitress import serve
scorer = scheduler.fixedScoreGenerator('.')
engine = scheduler.greedySearch()
app = Flask(__name__)


@app.route('/hello')
def hello():
    return '''<h>Welcome USC SCheduler Tool!!!</h>
              <p>Optimize your academic schedule with artificial intelligence</p>
            '''
@app.route('/', methods=['POST'])
def post():
	if request.method =='POST':
		courseList = request.json['course']
		constraint = request.json['constraint']
	try:
		scheduleList = engine.get_schedules(courseList,scorer,constraint)
		return jsonify({'schedules':scheduleList, 'success':1})
	except Exception as e:
            return jsonify({'schedules':[], 'success':0, 'error': str(e)})

if __name__ == '__main__':
    #scorer = scheduler.fixedScoreGenerator('.')
    #engine = scheduler.greedySearch()
    app.run(host='0.0.0.0' )
    #context.load_cert_chain("server.crt", "server.key")
    #app.run (debug = True, ssl_context='adhoc')
    


