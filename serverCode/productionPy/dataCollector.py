import sys
from library import gateway
from datetime import datetime, timedelta  
import os, time

outDir, verbose, semester = sys.argv[1], int(sys.argv[2]), sys.argv[3]
if verbose not in [0,1]: # sanity check 
	raise Exception ('verbose parameter must be either 1 or 0')

# update data every Saturday morning at 3AM PST
updateTime = datetime.now()  # get initial update time 
def update():
	keeper = gateway.SoCInterface()
	print ('semester: ', semester, '\ncollecting active instructors ...')
	activeprofList = keeper.get_all_instructors(semester)
	keeper = gateway.RMPInterface(outDir)
	print ('semester: ', semester, '\ncrawling RateMyProf website ...')
	keeper.update_prof_DB(activeprofList, verbose)
	print ('Done')



update() # intial update 
while True:
	currentTime = datetime.now()
	print ('elapsed time since last update: ', (currentTime - updateTime).seconds)
	if currentTime - updateTime >= timedelta(days=7) and currentTime.hour == 6:
		updateTime = datetime.now()  # record update time 
		update() # update 
	time.sleep(60*60) #sleep for one hour