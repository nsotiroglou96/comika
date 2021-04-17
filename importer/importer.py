from pymongo import MongoClient
import json

client = MongoClient('mongodb://root:9oVwzILM9isr@localhost:27017/admin')
db = client.comika
comics = db['comics']


with open('data.json') as json_file:
    data = json.load(json_file)
    comics.insert_many(data)
    print("Import complete!")
    client.close()
