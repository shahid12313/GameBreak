'use strict';
const ExcelJS = require('exceljs');
const { Session, Expense, Payment, Game } = require('../models');
const { httpError } = require('../middleware/errorHandler');

function range(req) {
  const now = new Date();
  let { from, to } = req.query;
  const a = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const b = to ? new Date(new Date(to).getTime() + 86400000) : new Date(now.getTime() + 1); // "to" is inclusive of that whole day
  if (isNaN(a.getTime()) || isNaN(b.getTime())) throw httpError(400, 'Invalid date range.');
  return [a, b];
}

async function summaryData(from, to) {
  const sessions = await Session.find({ status: 'completed', start: { $gte: from, $lt: to } }).lean();
  const expenses = await Expense.find({ date: { $gte: from, $lt: to } }).lean();
  const payments = await Payment.find({ at: { $gte: from, $lt: to } }).lean();

  const gameRevenue = sessions.reduce((s, x) => s + x.gameAmount, 0);
  const extrasRevenue = sessions.reduce((s, x) => s + x.extrasAmount, 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  const totalRevenue = gameRevenue + extrasRevenue;

  const byGameMap = {};
  sessions.forEach(s => {
    const k = String(s.gameId);
    byGameMap[k] ||= { gameId: k, gameName: s.gameName, sessions: 0, minutes: 0, revenue: 0 };
    byGameMap[k].sessions++; byGameMap[k].minutes += s.minutes; byGameMap[k].revenue += s.gameAmount + s.extrasAmount;
  });
  const byGame = Object.values(byGameMap).sort((a, b) => b.revenue - a.revenue)
    .map(g => ({ ...g, avgMinutes: g.sessions ? Math.round(g.minutes / g.sessions) : 0 }));

  const byMethodMap = {};
  payments.forEach(p => { byMethodMap[p.method] = (byMethodMap[p.method] || 0) + p.amount; });
  const byPaymentMethod = Object.entries(byMethodMap).map(([method, amount]) => ({ method, amount }));

  const dayMap = {};
  sessions.forEach(s => { const d = s.start.toISOString().slice(0, 10); dayMap[d] = (dayMap[d] || 0) + s.gameAmount + s.extrasAmount; });
  const dailySeries = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({ date, revenue }));

  return {
    gameRevenue, extrasRevenue, totalRevenue, totalExpenses, netRevenue: totalRevenue - totalExpenses,
    sessionCount: sessions.length, byGame, byPaymentMethod, dailySeries, sessions, expenses
  };
}

exports.summary = async (req, res) => {
  const [from, to] = range(req);
  const data = await summaryData(from, to);
  const { sessions, expenses, ...rest } = data;
  res.json(rest);
};

exports.dashboard = async (req, res) => {
  const now = new Date(); const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [today, active, stationsCount, availableCount, customersCount, pendingBookings] = await Promise.all([
    summaryData(dayStart, new Date(dayStart.getTime() + 86400000)),
    Session.countDocuments({ status: 'active' }),
    require('../models').Station.countDocuments(),
    require('../models').Station.countDocuments({ status: 'available' }),
    require('../models').Customer.countDocuments(),
    require('../models').Booking.countDocuments({ status: 'pending' })
  ]);
  res.json({
    todayRevenue: today.totalRevenue, todaySessions: today.sessionCount, activeSessions: active,
    availableStations: availableCount, totalStations: stationsCount, totalCustomers: customersCount,
    pendingBookings, todayExpenses: today.totalExpenses, netRevenue: today.netRevenue
  });
};

exports.exportExcel = async (req, res) => {
  const [from, to] = range(req);
  const data = await summaryData(from, to);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GameBreak';
  wb.created = new Date();

  const sum = wb.addWorksheet('Summary');
  sum.columns = [{ header: 'Metric', key: 'k', width: 28 }, { header: 'Value', key: 'v', width: 20 }];
  sum.addRows([
    { k: 'Period', v: `${from.toISOString().slice(0, 10)} to ${new Date(to - 1).toISOString().slice(0, 10)}` },
    { k: 'Game revenue', v: data.gameRevenue }, { k: 'Extras revenue', v: data.extrasRevenue },
    { k: 'Total revenue', v: data.totalRevenue }, { k: 'Total expenses', v: data.totalExpenses },
    { k: 'Net revenue', v: data.netRevenue }, { k: 'Sessions', v: data.sessionCount }
  ]);
  sum.getRow(1).font = { bold: true };

  const byGame = wb.addWorksheet('By Game');
  byGame.columns = [{ header: 'Game', key: 'gameName', width: 22 }, { header: 'Sessions', key: 'sessions', width: 12 },
    { header: 'Avg minutes', key: 'avgMinutes', width: 14 }, { header: 'Revenue', key: 'revenue', width: 14 }];
  byGame.addRows(data.byGame); byGame.getRow(1).font = { bold: true };

  const sessions = wb.addWorksheet('Sessions');
  sessions.columns = [
    { header: 'Date', key: 'date', width: 12 }, { header: 'Time', key: 'time', width: 10 },
    { header: 'Game', key: 'gameName', width: 18 }, { header: 'Station', key: 'stationName', width: 16 },
    { header: 'Customer', key: 'customerName', width: 18 }, { header: 'Minutes', key: 'minutes', width: 10 },
    { header: 'Game amount', key: 'gameAmount', width: 14 }, { header: 'Extras', key: 'extrasAmount', width: 10 },
    { header: 'Total', key: 'total', width: 12 }, { header: 'Payment', key: 'paymentMethod', width: 12 }
  ];
  data.sessions.forEach(s => sessions.addRow({
    date: s.start.toISOString().slice(0, 10), time: s.start.toISOString().slice(11, 16),
    gameName: s.gameName, stationName: s.stationName, customerName: s.customerName,
    minutes: s.minutes, gameAmount: s.gameAmount, extrasAmount: s.extrasAmount, total: s.total, paymentMethod: s.paymentMethod
  }));
  sessions.getRow(1).font = { bold: true };

  const exp = wb.addWorksheet('Expenses');
  exp.columns = [{ header: 'Date', key: 'date', width: 12 }, { header: 'Description', key: 'description', width: 30 },
    { header: 'Category', key: 'category', width: 16 }, { header: 'Amount', key: 'amount', width: 12 }];
  data.expenses.forEach(e => exp.addRow({ date: e.date.toISOString().slice(0, 10), description: e.description, category: e.category, amount: e.amount }));
  exp.getRow(1).font = { bold: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="gamebreak-revenue-${from.toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
};
