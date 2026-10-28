import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from '../../utils/request'

export function useTodos(saving) {
  // ── 待办列表 ──────────────────────────────────────────────
  const todoLoading = ref(true)
  const todoError = ref(false)
  const doneError = ref(false)
  const todoList = ref([])
  const doneList = ref([])
  const showAddModal = ref(false)
  const showEditModal = ref(false)
  const addForm = reactive({ entry: '', type: '', user: '' })
  const editForm = reactive({ id: null, entry_old: '', entry: '', type: '', user: '', start_date: '' })

  async function fetchTodoList() {
    todoLoading.value = true; todoError.value = false
    try {
      const res = await axios.get('/table_data')
      todoList.value = res.data.data || []
    } catch { todoError.value = true }
    finally { todoLoading.value = false }
  }

  async function fetchDoneList() {
    doneError.value = false
    try {
      const res = await axios.get('/table_done_list')
      doneList.value = res.data.data || []
    } catch { doneError.value = true }
  }

  async function handleAdd() {
    if (saving.value) return
    if (!addForm.entry.trim()) { ElMessage.warning('名称不能为空'); return }
    if (!addForm.type.trim())  { ElMessage.warning('类型不能为空'); return }
    if (!addForm.user.trim())  { ElMessage.warning('贡献人不能为空'); return }
    saving.value = true
    try {
      const fd = new FormData()
      fd.append('entry', addForm.entry)
      fd.append('type', addForm.type)
      fd.append('user', addForm.user)
      await axios.post('/admin/todos', fd)
      await fetchTodoList()
      addForm.entry = ''; addForm.type = ''; addForm.user = ''
      showAddModal.value = false
      ElMessage.success('添加成功!')
    } catch (e) {
      if (e.response?.status === 403) ElMessage.error('仅管理员可操作')
      else ElMessage.error(e.response?.data?.detail || '添加失败')
    } finally { saving.value = false }
  }

  function openEditModal(item) {
    editForm.id = item.id
    editForm.entry_old  = item.entry
    editForm.entry      = item.entry
    editForm.type       = item.type
    editForm.user       = item.user
    editForm.start_date = item.start_date
    showEditModal.value = true
  }

  async function handleEdit() {
    if (saving.value) return
    if (!editForm.entry.trim()) { ElMessage.warning('名称不能为空'); return }
    saving.value = true
    try {
      const fd = new FormData()
      fd.append('entry', editForm.entry)
      fd.append('type', editForm.type)
      fd.append('user', editForm.user)
      await axios.put(`/admin/todos/${editForm.id}`, fd)
      await fetchTodoList()
      showEditModal.value = false
      ElMessage.success('修改成功!')
    } catch (e) {
      if (e.response?.status === 403) ElMessage.error('仅管理员可操作')
      else ElMessage.error(e.response?.data?.detail || '修改失败')
    } finally { saving.value = false }
  }

  async function handleDelete(item) {
    if (saving.value) return
    saving.value = true
    try {
      await ElMessageBox.confirm(`确定删除「${item.entry}」吗？`, '删除确认', {
        confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
      })
      await axios.delete(`/admin/todos/${item.id}`)
      todoList.value = todoList.value.filter(t => t.entry !== item.entry)
      ElMessage.success('删除成功!')
    } catch (e) {
      if (e !== 'cancel' && e !== 'close') ElMessage.error(e.response?.data?.detail || '操作失败，请稍后重试')
    } finally { saving.value = false }
  }

  const reflectionItem = ref(null)
  const completingReflection = ref(false)
  function handleDone(item) {
    if (saving.value) return
    completingReflection.value = true
    reflectionItem.value = { ...item }
  }
  function editReflection(item) {
    completingReflection.value = false
    reflectionItem.value = { ...item }
  }
  async function reflectionSaved() {
    await Promise.allSettled([fetchTodoList(), fetchDoneList()])
  }

  async function handleDeleteDone(item) {
    if (saving.value) return
    saving.value = true
    try {
      await ElMessageBox.confirm(`确定删除「${item.entry}」？删除后不可恢复。`, '删除确认', {
        confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
      })
      await axios.delete(`/admin/todos/${item.id}`)
      doneList.value = doneList.value.filter(t => t.entry !== item.entry)
      ElMessage.success('已删除')
    } catch (e) {
      if (e !== 'cancel' && e !== 'close') ElMessage.error(e.response?.data?.detail || '操作失败，请稍后重试')
    } finally { saving.value = false }
  }


  return { reflectionItem, completingReflection, editReflection, reflectionSaved, todoLoading, todoError, doneError, todoList, doneList, showAddModal, showEditModal, addForm, editForm, fetchTodoList, fetchDoneList, handleAdd, openEditModal, handleEdit, handleDelete, handleDone, handleDeleteDone }
}
