import importlib.util,pathlib,unittest
spec=importlib.util.spec_from_file_location('retention',pathlib.Path(__file__).with_name('app-retention.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Retention(unittest.TestCase):
 def test_preserves_current_and_every_container_reference(self):
  current='a'*40;tags=['luatvietduc-web:'+current,'luatvietduc-web:'+'b'*40,'luatvietduc-web:'+'c'*40,'other:latest','luatvietduc-web:latest']
  ids={tags[1]:'used',tags[2]:'unused'}
  self.assertEqual(list(m.obsolete(tags,current,{'used'},lambda tag:ids[tag])),[tags[2]])
 def test_unknown_release_cannot_delete(self):
  with self.assertRaises(ValueError):list(m.obsolete(['luatvietduc-web:'+'b'*40],'invalid',set(),lambda _:''))
 def test_cleanup_is_project_scoped(self):
  source=pathlib.Path(m.__file__).read_text()
  self.assertIn("'deploy.lock'",source);self.assertNotIn("'system','prune'",source);self.assertNotIn("'volume','rm'",source);self.assertNotIn("'--force',tag",source)
if __name__=='__main__':unittest.main()
