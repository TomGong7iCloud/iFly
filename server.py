#!/usr/bin/env python3
"""
iFly · Flask Backend with SQLite
提供飞行记录的 RESTful API，将数据持久化到单文件 SQLite 数据库
"""

import os
import sqlite3
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS

app = Flask(__name__, static_folder=None)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'flights.db')

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """初始化数据库表"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS flights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            flightNo TEXT NOT NULL,
            airline TEXT,
            from_airport TEXT NOT NULL,
            to_airport TEXT NOT NULL,
            from_name TEXT,
            to_name TEXT,
            date TEXT NOT NULL,
            aircraft TEXT,
            durationMin INTEGER DEFAULT 0,
            distance INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    # 仅允许访问前端资源目录，避免暴露数据库文件与后端源码
    allowed_prefixes = ('css/', 'js/', 'assets/', 'index.html')
    if path.startswith(allowed_prefixes) or path == '':
        return send_from_directory('.', path)
    abort(404)


@app.route('/api/flights', methods=['GET'])
def list_flights():
    """获取所有飞行记录"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, flightNo, airline,
               from_airport as `from`, to_airport as `to`,
               from_name, to_name, date, aircraft, durationMin, distance
        FROM flights ORDER BY date ASC
    ''')
    rows = cursor.fetchall()
    conn.close()

    flights = []
    for r in rows:
        flights.append({
            'id': r['id'],
            'flightNo': r['flightNo'],
            'airline': r['airline'],
            'from': r['from'],
            'to': r['to'],
            'fromName': r['from_name'],
            'toName': r['to_name'],
            'date': r['date'],
            'aircraft': r['aircraft'],
            'durationMin': r['durationMin'],
            'distance': r['distance']
        })
    return jsonify(flights)


@app.route('/api/flights', methods=['POST'])
def add_flight():
    """新增一条飞行记录"""
    data = request.get_json(silent=True) or {}
    required = ['flightNo', 'from', 'to', 'date']
    for k in required:
        if k not in data:
            abort(400, description=f'Missing required field: {k}')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO flights
        (flightNo, airline, from_airport, to_airport, from_name, to_name, date, aircraft, durationMin, distance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('flightNo'),
        data.get('airline'),
        data.get('from'),
        data.get('to'),
        data.get('fromName'),
        data.get('toName'),
        data.get('date'),
        data.get('aircraft'),
        data.get('durationMin', 0),
        data.get('distance', 0)
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({'id': new_id, 'success': True})


@app.route('/api/flights/<int:flight_id>', methods=['PUT'])
def update_flight(flight_id):
    """修改一条飞行记录（仅更新提供的字段）"""
    data = request.get_json(silent=True) or {}

    # 前端字段名 -> 数据库列名
    field_map = {
        'flightNo': 'flightNo',
        'airline': 'airline',
        'from': 'from_airport',
        'to': 'to_airport',
        'fromName': 'from_name',
        'toName': 'to_name',
        'date': 'date',
        'aircraft': 'aircraft',
        'durationMin': 'durationMin',
        'distance': 'distance',
    }

    updates = []
    values = []
    for key, col in field_map.items():
        if key in data:
            updates.append(f'{col} = ?')
            values.append(data[key])

    if not updates:
        abort(400, description='No fields to update')

    conn = get_db()
    cursor = conn.cursor()
    values.append(flight_id)
    cursor.execute(f'UPDATE flights SET {", ".join(updates)} WHERE id = ?', values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        abort(404, description='Flight not found')
    return jsonify({'success': True})


@app.route('/api/flights/<int:flight_id>', methods=['DELETE'])
def delete_flight(flight_id):
    """删除一条飞行记录"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM flights WHERE id = ?', (flight_id,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        abort(404, description='Flight not found')
    return jsonify({'success': True})


init_db()

if __name__ == '__main__':
    print(f'数据库路径: {DB_PATH}')
    app.run(host='127.0.0.1', port=8000, debug=False)