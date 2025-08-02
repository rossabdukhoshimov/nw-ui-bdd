import boto3
import os
from botocore.exceptions import ProfileNotFound
from boto3.dynamodb.conditions import Key

REGION = 'us-east-1'


class DBHelpers:
    def __init__(self, table_name, prime_key_name, sorting_key_name):
        self.table_name = table_name
        self.dynamodb = self._get_dynamodb_resource()
        self.table = self.dynamodb.Table(table_name)
        self.prime_key_name = prime_key_name
        self.sorting_key_name = sorting_key_name

    def _get_dynamodb_resource(self):
        try:
            session = boto3.Session(profile_name="DEVINT", region_name=REGION)
            return session.resource('dynamodb', region_name=REGION)
        except ProfileNotFound:
            pass

        try:
            session = boto3.Session(profile_name="INT", region_name=REGION)
            return session.resource('dynamodb', region_name=REGION)
        except ProfileNotFound:
            pass

        aws_access_key = os.getenv("INT_AWS_ACCESS_KEY_ID")
        aws_secret_key = os.getenv("INT_AWS_SECRET_ACCESS_KEY")
        aws_session_token = os.getenv("INT_AWS_SESSION_TOKEN")
        if aws_session_token is None:
            aws_session_token = os.getenv("INT_SESSION_TOKEN")

        if aws_access_key and aws_secret_key:
            session = boto3.Session(
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                aws_session_token=aws_session_token,
                region_name=REGION
            )
            return session.resource('dynamodb', region_name=REGION)

        raise Exception("AWS credentials not found via DEVINT, INT, or env vars")

    def query_by_prime_key(self, prime_key_value):
        response = self.table.query(
            KeyConditionExpression=Key(self.prime_key_name).eq(prime_key_value)
        )
        return response.get('Items', [])

    def all_prime_keys(self) -> list[str]:
        response = self.table.scan()
        items = response.get('Items', [])

        while 'LastEvaluatedKey' in response:
            response = self.table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))

        prime_keys = [item.get(self.prime_key_name) for item in items]
        prime_keys = list(set(prime_keys))
        prime_keys.sort()
        return prime_keys

    def update_item(self, primary_value, sorting_value, update_dict, condition_dict=None):
        expression_names = {}
        expression_values = {}
        expression_list = []
        for i, key in enumerate(update_dict.keys()):
            expression_list.append(f"#F{i} = :v{i}")
            expression_names[f"#F{i}"] = key
            expression_values[f":v{i}"] = update_dict[key]
        update_expression = f"SET {', '.join(expression_list)}"

        kwargs = {
            'Key': {self.prime_key_name: primary_value, self.sorting_key_name: sorting_value},
            'UpdateExpression': update_expression,
            'ExpressionAttributeNames': expression_names,
            'ExpressionAttributeValues': expression_values,
            'ReturnValues': "UPDATED_NEW"
        }
        if condition_dict:
            condition_list = []
            for i, key in enumerate(condition_dict.keys()):
                condition_list.append(f"#CF{i} = :cv{i}")
                expression_names[f"#CF{i}"] = key
                expression_values[f":cv{i}"] = condition_dict[key]
            kwargs['ConditionExpression'] = ', '.join(condition_list)

        return self.table.update_item(**kwargs)

    def batch_put(self, items):
        with self.table.batch_writer() as batch:
            for item in items:
                batch.put_item(Item=item)
        print(f"Processed batch_put for {len(items)} records")

    def batch_delete(self, keys):
        with self.table.batch_writer() as batch:
            for key in keys:
                batch.delete_item(Key=key)
        print(f"Processed batch_delete for {len(keys)} records")
