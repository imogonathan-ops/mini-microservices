<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend, type ChartOptions } from 'chart.js'
import type { Measurement } from '../types/domain'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend)
const props = withDefaults(defineProps<{ points: Measurement[]; metric?: 'temperature' | 'humidity' }>(), { metric: 'temperature' })
const isTemp = computed(() => props.metric === 'temperature')
const dataset = computed(() => {
  const points = props.points.slice(-55)
  const color = isTemp.value ? '#50dec2' : '#8b9cff'
  return {
    labels: points.map((p, i) => i % 6 === 0 || i === points.length - 1 ? new Date(p.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''),
    datasets: [{
      label: isTemp.value ? 'Température' : 'Humidité',
      data: points.map(p => isTemp.value ? p.temperature : p.humidity),
      borderColor: color,
      backgroundColor: (ctx: { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } } }) => {
        const { chart } = ctx
        if (!chart.chartArea) return 'rgba(80,222,194,.12)'
        const gradient = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom)
        gradient.addColorStop(0, isTemp.value ? 'rgba(80,222,194,.22)' : 'rgba(139,156,255,.20)')
        gradient.addColorStop(1, 'rgba(80,222,194,0)')
        return gradient
      },
      borderWidth: 2.5, fill: true, tension: 0.38, pointRadius: 0, pointHoverRadius: 5,
      pointBackgroundColor: color, pointBorderColor: '#101827', pointHoverBorderWidth: 2
    }]
  }
})
const options: ChartOptions<'line'> = {
  responsive: true, maintainAspectRatio: false,
  animation: { duration: 330 },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#202b3f', titleColor: '#e9f1ff', bodyColor: '#bfcde2', borderColor: '#39455a', borderWidth: 1, padding: 11, displayColors: false }
  },
  scales: {
    x: { border: { display: false }, grid: { display: false }, ticks: { color: '#718099', maxRotation: 0, autoSkip: false, font: { size: 11 } } },
    y: { position: 'right', border: { display: false, dash: [3, 5] }, grid: { color: '#263144', drawTicks: false }, ticks: { color: '#718099', padding: 12, maxTicksLimit: 5, callback: value => `${value}${isTemp.value ? '°' : '%'}` } }
  }
}
</script>
<template>
  <div class="trend-canvas">
    <Line v-if="points.length" :data="dataset" :options="options" />
    <div v-else class="chart-empty">Aucune donnée historique reçue</div>
  </div>
</template>
