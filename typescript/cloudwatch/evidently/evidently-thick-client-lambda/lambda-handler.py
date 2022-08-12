import boto3


def main(event, context):
  client = boto3.client('evidently')
  evaluation = client.evaluate_feature(
    project='EvidentlyExampleProject',
    feature='MyExampleFeature',
    entityId='someUserId'
  )
  print(evaluation)
