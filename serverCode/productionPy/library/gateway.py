# Gateway.py: crawler code that collects data from USC Schedule of Class database and Rate My Professor website 
import requests
import os,json
from os.path import join, isdir
from pprint import pprint
import itertools as it
import dask
import re
from bs4 import BeautifulSoup
import string 
import numpy as np
import sys

'''
SoCInterface: connects to USC SoC database and get instructor information for the given semester
'''
class SoCInterface:
    def __init__(self):
        self.SoCPrefix = 'http://web-app.usc.edu/web/soc/api' 
    '''
    get the list of active instructors of the given semester. 
    Take ~10 secs to run 
    parameter: 
        semester, str, for instance: '20193' (2019 Fall)
    return:
        prof name, set, for instance: {(first, last), (first, last)...}
    '''
    def get_all_instructors(self, semester):
        url = '/'.join([self.SoCPrefix,'depts', semester]) # form a valid url
        schoolList = self.__make_request(url)['department']
        deptList = list(map(self.__dept_extractor, schoolList)) 
        deptList = list(it.chain.from_iterable(deptList)) # flatten the data structure, [{code:csci, name:comp science},{}]
        # now use get instructor info (multithreading)
        multithreader = [ dask.delayed(self.__get_dept_course)(dept,semester) for dept in deptList]
        # flattened result
        return list(set(list(it.chain.from_iterable(dask.compute(*multithreader, scheduler = 'threads',num_workers=12))) ))

    #---------------------------
    # private helpers 
    '''
    retrieve information from the given url 
    parameter:
        url: a valid url 
    return:
        a json file 
    '''
    def __make_request(self, url):
        try:
            response = requests.post(url)
        except: # in case of time-out, reconnect
            response = requests.post(url)
        return response.json()
    '''
    extract department names
    parameter: 
        dictionary: a dictionary of school information
    return:
        a list of departments under the given school, list of str
    '''
    def __dept_extractor(self, dictionary):
        try:
            if type(dictionary['department']) == list:
                return dictionary['department']
            else:
                return [dictionary['department']] # some school only has one department 
        except:
            return [dictionary] # some school might not have sub-department
    '''
    extract course information 
    parameter: 
        courseData: dictionary generated by __get_dept_course
    return:
        list of intructors of an given class, list of tuple
    '''
    def __course_extractor(self, courseData):
        if courseData['canceled'] == 'Y' or courseData['canceled'] == 'y':
            return []# return an empty dict if the session is cancled
        if 'instructor' in courseData:
            if type(courseData['instructor']) == dict: # mutiple instructors
                return [(courseData['instructor']['first_name'], courseData['instructor']['last_name']) ]
            else: # multiple prof for the same section
                return [(prof['first_name'], prof['last_name']) for prof in courseData['instructor']]
        else:
            return []
        
    '''
    get all courses under the same department
    parameter: 
        deptInfo, dictionary generated by getAllInstructors
        semester, str, for instance: '20193' (2019 Fall)
    return: a list of professors under the given department, a list of tuple
    '''
    def __get_dept_course(self,deptInfo, semester):
        url = '/'.join([self.SoCPrefix,'classes' ,deptInfo['code'], semester])
        courseList = self.__make_request(url)['OfferedCourses']['course']
        if type(courseList) == dict: # some dept has only one course
            courseList = [courseList]
        profList = []
        for course in courseList: 
            if type(course['CourseData']['SectionData']) == dict:  # some course has only one session
                profList += [self.__course_extractor(course['CourseData']['SectionData'])]
            else:
                profList += list(map(self.__course_extractor, course['CourseData']['SectionData']))
        return list(it.chain.from_iterable(profList)) # flatten the list

'''
connects to RateMyProf and collects information 
'''
class RMPInterface:
    def __init__(self, outDir):
        if not isdir(outDir):
            os.mkdir (outDir)
        self.outDir = outDir
        self.RMPPrefix = 'https://www.ratemyprofessors.com'
        self. queryBody = '/search.jsp?queryoption=HEADER&queryBy=teacherName&schoolName=University+of+Southern+California&schoolID=1381&query='

    '''
	get scores of each professor in the given list
	parameter:
		profList: a list of professor name, list of tuples, for instance,[('first name, last name'),()]
	return 
		profScoreList: a dictionary of professor and his/her ratings, # of raters, # percentage of peope who want to take the class again,
		for instance: {'Aaron Cote': [4.0, 20, 0.8], ...}
    '''
    def update_prof_DB(self, profList, verbose=0):
        multithreader = [ dask.delayed(self.__get_prof_info)(prof, verbose) for prof in profList]
        profScoreList = list(dask.compute(*multithreader, scheduler = 'threads', num_workers=12))
        profScoreList = list (filter (lambda profInfo: len(profInfo)>0, profScoreList))
        
        with open(join(self.outDir,'profInfoDB.json'), 'w') as outfile:
            json.dump(dict(profScoreList), outfile)
        return profScoreList
    '''    
    retrieve information about the given professor
    parameter:
        profName, tuple, (first name, last name)
    return: 
        information about the prof, tuple, for instance:
        (name, {department name 1: (score, # of raters), department name 2: (score, # of raters)}) 
        a name may have several departments because people may have the same name
    '''
    def __get_prof_info(self, profName, verbose = 0):
        if verbose == 1:
            print ('processing prof:', profName)
        url = ''.join([self.RMPPrefix,self.queryBody,'+'.join(profName)])
        profListPage = BeautifulSoup(self.__make_request(url), 'html.parser')
        relatedProf = []
        for listings in  profListPage.find_all('li', {'class':'listing PROFESSOR'}):
            profUrl = self.RMPPrefix + listings.find('a', href=True)['href']# link to prof's individual page
            dept = listings.find('span', attrs = {'class':'sub'}).text.split(',')[-1]
            profInfoPage = BeautifulSoup(self.__make_request(profUrl), 'html.parser')
            rateTuple = self.__extract_prof_info(profInfoPage)
            if rateTuple != tuple(): # in case no information found 
                relatedProf.append (rateTuple)
        relatedProf = np.array(list (filter (lambda x:len(x)>1, relatedProf)))
        try:
            return (' '.join(profName), [np.mean(relatedProf[:,0]), np.mean(relatedProf[:,1]), sum(relatedProf[:,2])])
        except:
            return (' '.join(profName), [])
    '''
    make request and return text data
    parameter:
        url: a valid url pointing to RMP pages
    return:
        web content, str
    '''
    def __make_request(self, url):
        try:
            response = requests.post(url)
        except: # in case of time-out, reconnect
            response = requests.post(url)
        return response.text
    
    def __extract_prof_info(self, profInfoPage):
        try:
            grade = profInfoPage.find_all('div', {'class': 'grade'}, limit=2) # get avg. RMP score
            # get num of rater
            raterNum = re.findall(r'\b\d+\b',profInfoPage.find('div', {'class': 'table-toggle rating-count active'}).text)
            avgScore, diffLevel = float(grade[0].text),  float(re.findall(r'\b\d+\b',grade[1].text)[0])/100
            return [ avgScore, diffLevel, int(raterNum[0])]
        except:
            return []

