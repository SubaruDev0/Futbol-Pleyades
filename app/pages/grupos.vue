<script setup lang="ts">
import GroupsView from '~/components/GroupsView.vue'
import GroupDialog from '~/components/GroupDialog.vue'

useHead({ title: 'Grupos' })

const route = useRoute()
const { data: groups, refresh } = await useFetch('/api/groups')
// Los links de los tutoriales llegan aquí en la pestaña correcta, con scroll hasta quedar a la vista.
const initialTab = route.query.tab === 'join' ? 'join' : 'create'

const openId = ref<string | null>(null)
const openGroup = computed(() => groups.value?.find(g => g.id === openId.value) ?? null)
const dialogOpen = computed({
  get: () => !!openGroup.value,
  set: (v: boolean) => { if (!v) openId.value = null },
})
</script>

<template>
  <div>
    <GroupsView :groups="groups ?? []" :focus-actions="!!route.query.tab" @open="openId = $event">
      <template #actions>
        <GroupActions :initial="initialTab" @done="refresh" />
      </template>
    </GroupsView>

    <GroupDialog v-model="dialogOpen" :group="openGroup" @changed="refresh" />
  </div>
</template>
