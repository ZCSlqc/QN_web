import json
from fastapi import HTTPException


def as_list(value):
    if isinstance(value, list):
        return value
    if isinstance(value, str) and value.lstrip().startswith('['):
        try:
            result = json.loads(value)
        except ValueError:
            raise HTTPException(400, '城市数组格式不正确')
        if not isinstance(result, list):
            raise HTTPException(400, '城市必须是数组')
        return result
    raise HTTPException(400, '城市名称和代码必须使用 JSON 数组')


def city_code(code):
    return code[:2] + '0000' if code[:2] in ('11', '12', '31', '50', '81', '82') else code


def normalize_cities(names, codes):
    names, codes = as_list(names), as_list(codes)
    if not names or len(names) != len(codes) or len(names) > 30:
        raise HTTPException(400, '请为每个城市选择对应地区，最多30个城市')
    pairs = {}
    municipalities = {'11': '北京市', '12': '天津市', '31': '上海市', '50': '重庆市', '81': '香港特别行政区', '82': '澳门特别行政区'}
    for name, code in zip(names, codes):
        if not isinstance(name, str) or not name.strip() or len(name) > 100:
            raise HTTPException(400, '城市名称无效')
        if not isinstance(code, str) or len(code) != 6 or not code.isascii() or not code.isdigit():
            raise HTTPException(400, '城市代码无效')
        pairs[city_code(code)] = municipalities.get(code[:2], name.strip())
    return list(pairs.values()), list(pairs)


def journey_payload(row):
    result = dict(row)
    result['name'], result['adcodes'] = normalize_cities(row['name'], row['adcodes'])
    return result
